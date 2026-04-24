import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../utils/AppError.js';
// ==================== CLINICS ====================
export const createClinic = async (data) => {
    const { name, location, email, contact, subscriptionDuration = 1, subscriptionPlan = 'Monthly', manualDays = 30, password, numberOfUsers = 5 } = data;
    console.log(data.logo);
    if (!name || !email || !contact || !password) {
        throw new AppError('Name, Email, Contact Number, and Password are all required.', 400);
    }
    // Generate unique subdomain
    const baseSubdomain = (data.subdomain || name.toLowerCase().replace(/ /g, '-')).replace(/[^a-z0-9-]/g, '');
    let subdomain = baseSubdomain || 'clinic';
    let counter = 1;
    while (await prisma.clinic.findUnique({ where: { subdomain } })) {
        subdomain = `${baseSubdomain}-${counter++}`;
    }
    const start = new Date();
    const end = new Date();
    if (subscriptionPlan === 'Trial') {
        end.setDate(start.getDate() + 7);
    }
    else if (subscriptionPlan === 'Manual') {
        end.setDate(start.getDate() + Number(manualDays));
    }
    else {
        end.setMonth(start.getMonth() + Number(subscriptionDuration));
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    // Transaction to ensure both clinic and admin/staff are created
    return await prisma.$transaction(async (tx) => {
        const clinic = await tx.clinic.create({
            data: {
                name,
                subdomain,
                location,
                email,
                contact,
                logo: typeof data.logo === 'string' ? data.logo : null,
                status: 'active',
                modules: JSON.stringify({ pharmacy: true, radiology: true, laboratory: true, billing: true }),
                subscriptionPlan,
                subscriptionStart: start,
                subscriptionEnd: end,
                isActive: true,
                userLimit: Number(numberOfUsers)
            }
        });
        // Create the first admin user for this clinic
        let user = await tx.user.findUnique({ where: { email } });
        if (user) {
            throw new AppError('This email is already registered to another user/clinic admin.', 400);
        }
        user = await tx.user.create({
            data: {
                email,
                password: hashedPassword,
                name: name, // Set admin name identical to clinic name
                phone: contact,
                role: 'ADMIN'
            }
        });
        await tx.clinicstaff.create({
            data: {
                userId: user.id,
                clinicId: clinic.id,
                role: 'ADMIN'
            }
        });
        // Auto-generate first invoice
        const pricePerUser = Number(data.subscriptionAmount || 0);
        const users = Number(numberOfUsers);
        const totalBaseAmount = pricePerUser * users;
        const gstPercent = Number(data.gstPercent || 0);
        const taxAmount = (totalBaseAmount * gstPercent) / 100;
        const finalAmount = totalBaseAmount + taxAmount;
        await tx.subscription_invoice.create({
            data: {
                clinicId: clinic.id,
                invoiceNumber: `INV-${Date.now()}-${clinic.id}`,
                amount: finalAmount,
                status: 'Unpaid',
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
                description: JSON.stringify({
                    base: totalBaseAmount,
                    pricePerUser,
                    users,
                    tax: taxAmount,
                    percent: gstPercent,
                    plan: subscriptionPlan,
                    duration: subscriptionDuration,
                    note: subscriptionPlan === 'Trial'
                        ? `Initial Trial subscription for 1 months`
                        : `Initial ${subscriptionPlan} subscription for ${subscriptionDuration} months`
                })
            }
        });
        await tx.auditlog.create({
            data: {
                action: 'Clinic Created',
                performedBy: 'SUPER_ADMIN',
                clinicId: clinic.id,
                details: JSON.stringify({ clinicName: name, subdomain, subscriptionEnd: end })
            }
        });
        return { ...clinic, adminUser: { email: user.email } };
    }, {
        maxWait: 5000, // default: 2000
        timeout: 20000 // default: 5000
    });
};
export const getClinics = async () => {
    const clinics = await prisma.clinic.findMany({
        include: {
            _count: {
                select: {
                    clinicstaff: true,
                    patient: true,
                    appointment: true,
                    subscriptionInvoices: true
                }
            },
            clinicstaff: {
                include: {
                    user: {
                        select: { name: true, email: true }
                    }
                }
            },
            subscriptionInvoices: {
                where: { status: 'Paid' },
                select: { amount: true }
            }
        }
    });
    return clinics.map(clinic => {
        const isExpired = clinic.subscriptionEnd ? new Date() > clinic.subscriptionEnd : false;
        // Count roles specifically
        const doctors = clinic.clinicstaff.filter(s => s.role === 'DOCTOR').length;
        const admins = clinic.clinicstaff.filter(s => s.role === 'ADMIN');
        const adminName = admins.length > 0 ? admins[0].user.name : 'N/A';
        const adminEmail = admins.length > 0 ? admins[0].user.email : 'N/A';
        const adminCount = admins.length;
        const totalStaffRecords = clinic.clinicstaff.length;
        const otherStaff = totalStaffRecords - doctors - adminCount;
        // Calculate Revenue
        const totalRevenue = clinic.subscriptionInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
        const totalInvoices = clinic._count.subscriptionInvoices;
        const daysRemaining = clinic.subscriptionEnd
            ? Math.ceil((new Date(clinic.subscriptionEnd).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
            : 0;
        return {
            ...clinic,
            modules: clinic.modules ? (typeof clinic.modules === 'string' ? JSON.parse(clinic.modules) : clinic.modules) : { pharmacy: true, radiology: true, laboratory: true, billing: true },
            isExpired,
            daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
            adminName,
            adminEmail,
            counts: {
                patients: clinic._count.patient,
                doctors,
                admins: adminCount,
                staff: otherStaff > 0 ? otherStaff : 0,
                appointments: clinic._count.appointment,
                totalRevenue,
                totalInvoices
            }
        };
    });
};
export const generateClinicInvoice = async (clinicId, amount, description) => {
    const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } });
    if (!clinic)
        throw new AppError('Clinic not found', 404);
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7); // 7 days due date default
    const invoice = await prisma.subscription_invoice.create({
        data: {
            clinicId,
            invoiceNumber,
            amount,
            description,
            status: 'Unpaid',
            issuedDate: new Date(),
            dueDate
        }
    });
    await prisma.auditlog.create({
        data: {
            action: 'Invoice Generated',
            performedBy: 'SUPER_ADMIN',
            details: JSON.stringify({ invoiceId: invoice.id, clinicId, amount })
        }
    });
    return invoice;
};
export const checkClinicExpirations = async () => {
    const today = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(today.getDate() + 3);
    const expiringClinics = await prisma.clinic.findMany({
        where: {
            subscriptionEnd: {
                lte: threeDaysFromNow,
                gte: today
            },
            isActive: true
        }
    });
    // Create notifications for expiring clinics
    for (const clinic of expiringClinics) {
        await prisma.notification.create({
            data: {
                clinicId: clinic.id,
                department: 'ADMIN',
                message: `URGENT: Your clinic subscription expires on ${clinic.subscriptionEnd?.toDateString()}. Please renew to avoid service interruption.`,
                status: 'unread'
            }
        });
    }
    return expiringClinics;
};
export const getInvoices = async (filters) => {
    const where = {};
    if (filters?.clinicId) {
        where.clinicId = filters.clinicId;
    }
    if (filters?.status && filters.status !== 'all') {
        where.status = filters.status;
    }
    if (filters?.startDate || filters?.endDate) {
        where.issuedDate = {};
        if (filters.startDate)
            where.issuedDate.gte = new Date(filters.startDate);
        if (filters.endDate)
            where.issuedDate.lte = new Date(filters.endDate);
    }
    const invoices = await prisma.subscription_invoice.findMany({
        where,
        include: {
            clinic: {
                select: {
                    id: true,
                    name: true,
                    subscriptionPlan: true
                }
            }
        },
        orderBy: { issuedDate: 'desc' }
    });
    return invoices;
};
export const getSuperAdminReports = async (startDate, endDate) => {
    const where = {};
    if (startDate || endDate) {
        where.issuedDate = {};
        if (startDate)
            where.issuedDate.gte = new Date(startDate);
        if (endDate)
            where.issuedDate.lte = new Date(endDate);
    }
    const [totalInvoices, paidInvoices, totalRevenue] = await Promise.all([
        prisma.subscription_invoice.count({ where }),
        prisma.subscription_invoice.count({ where: { ...where, status: 'Paid' } }),
        prisma.subscription_invoice.aggregate({
            where: { ...where, status: 'Paid' },
            _sum: { amount: true }
        })
    ]);
    // Get clinic-wise revenue
    const clinicRevenue = await prisma.subscription_invoice.groupBy({
        by: ['clinicId'],
        where: { ...where, status: 'Paid' },
        _sum: { amount: true },
        _count: true
    });
    const clinicDetails = await prisma.clinic.findMany({
        where: {
            id: { in: clinicRevenue.map(cr => cr.clinicId) }
        },
        select: { id: true, name: true }
    });
    const topClinics = clinicRevenue.map(cr => {
        const clinic = clinicDetails.find(c => c.id === cr.clinicId);
        return {
            clinicId: cr.clinicId,
            name: clinic?.name || 'Unknown',
            invoices: cr._count,
            revenue: Number(cr._sum.amount || 0)
        };
    }).sort((a, b) => b.revenue - a.revenue);
    return {
        totalInvoices,
        paidInvoices,
        unpaidInvoices: totalInvoices - paidInvoices,
        totalRevenue: Number(totalRevenue._sum.amount || 0),
        topClinics: topClinics.slice(0, 10)
    };
};
export const updateClinic = async (id, data) => {
    // Extract password and other non-clinic fields
    const { password, subscriptionDuration, manualDays, subscriptionAmount, gstPercent, numberOfUsers, ...clinicData } = data;
    // Sanitize logo to ensure it's a string path or removed if invalid
    if (clinicData.logo && typeof clinicData.logo !== 'string') {
        delete clinicData.logo;
    }
    // If password is provided and not empty, update the admin user's password
    if (password && password.trim() !== '') {
        // Find the admin user for this clinic
        const adminStaff = await prisma.clinicstaff.findFirst({
            where: {
                clinicId: id,
                role: 'ADMIN'
            },
            include: {
                user: true
            }
        });
        if (adminStaff) {
            const hashedPassword = await bcrypt.hash(password, 12);
            await prisma.user.update({
                where: { id: adminStaff.userId },
                data: { password: hashedPassword }
            });
        }
    }
    // Handle subscription updates if provided
    if (subscriptionDuration !== undefined || manualDays !== undefined || clinicData.subscriptionPlan) {
        // Fetch current clinic to get existing subscription plan if not provided
        const currentClinic = clinicData.subscriptionPlan ? null : await prisma.clinic.findUnique({
            where: { id },
            select: { subscriptionPlan: true, subscriptionStart: true }
        });
        const start = clinicData.subscriptionPlan ? new Date() : (currentClinic?.subscriptionStart || new Date());
        const end = new Date();
        const plan = clinicData.subscriptionPlan || currentClinic?.subscriptionPlan || 'Monthly';
        const duration = subscriptionDuration || 1;
        const days = manualDays || 30;
        if (plan === 'Trial') {
            end.setDate(start.getDate() + 7);
        }
        else if (plan === 'Manual') {
            end.setDate(start.getDate() + Number(days));
        }
        else {
            end.setMonth(start.getMonth() + Number(duration));
        }
        clinicData.subscriptionEnd = end;
        if (clinicData.subscriptionPlan) {
            clinicData.subscriptionStart = start;
        }
    }
    // Update clinic with only valid clinic fields
    const clinic = await prisma.clinic.update({
        where: { id },
        data: clinicData
    });
    await prisma.auditlog.create({
        data: {
            action: 'Clinic Updated',
            performedBy: 'SUPER_ADMIN',
            clinicId: id,
            details: JSON.stringify({ clinicId: id, updates: Object.keys(clinicData) })
        }
    });
    return clinic;
};
export const toggleClinicStatus = async (id) => {
    const clinic = await prisma.clinic.findUnique({ where: { id } });
    if (!clinic)
        throw new AppError('Clinic not found', 404);
    const isActivating = clinic.status !== 'active';
    const updatedClinic = await prisma.clinic.update({
        where: { id },
        data: {
            status: isActivating ? 'active' : 'inactive',
            isActive: isActivating
        }
    });
    await prisma.auditlog.create({
        data: {
            action: 'Clinic Status Toggled',
            performedBy: 'SUPER_ADMIN',
            details: JSON.stringify({ clinicId: id, newStatus: updatedClinic.status })
        }
    });
    return updatedClinic;
};
export const deleteClinic = async (id) => {
    // Verify clinic exists
    const clinic = await prisma.clinic.findUnique({ where: { id } });
    if (!clinic)
        throw new AppError('Clinic not found', 404);
    // Delete all related records in a transaction
    await prisma.$transaction(async (tx) => {
        // Unlink existing audit logs to prevent foreign key errors
        await tx.auditlog.updateMany({
            where: { clinicId: id },
            data: { clinicId: null }
        });
        // Create audit log before deletion
        await tx.auditlog.create({
            data: {
                action: 'Clinic Deleted',
                performedBy: 'SUPER_ADMIN',
                clinicId: null,
                details: JSON.stringify({ clinicId: id, clinicName: clinic.name })
            }
        });
        // Delete records that depend on other clinic-related records first
        await tx.formresponse.deleteMany({ where: { clinicId: id } });
        await tx.appointment.deleteMany({ where: { clinicId: id } });
        await tx.invoice.deleteMany({ where: { clinicId: id } });
        await tx.medicalrecord.deleteMany({ where: { clinicId: id } });
        await tx.service_order.deleteMany({ where: { clinicId: id } });
        // Delete records that depend on clinic
        await tx.patient.deleteMany({ where: { clinicId: id } });
        await tx.formtemplate.deleteMany({ where: { clinicId: id } });
        await tx.inventory.deleteMany({ where: { clinicId: id } });
        await tx.notification.deleteMany({ where: { clinicId: id } });
        await tx.subscription_invoice.deleteMany({ where: { clinicId: id } });
        await tx.department.deleteMany({ where: { clinicId: id } });
        // Delete clinic staff (this links users to clinics, but we don't delete users)
        await tx.clinicstaff.deleteMany({ where: { clinicId: id } });
        // Delete the clinic itself
        await tx.clinic.delete({ where: { id } });
    });
    return null;
};
export const updateClinicModules = async (id, modules) => {
    const clinic = await prisma.clinic.update({
        where: { id },
        data: { modules: typeof modules === 'string' ? modules : JSON.stringify(modules) }
    });
    await prisma.auditlog.create({
        data: {
            action: 'Clinic Modules Updated',
            performedBy: 'SUPER_ADMIN',
            details: JSON.stringify({ clinicId: id, modules })
        }
    });
    return {
        ...clinic,
        modules: typeof clinic.modules === 'string' ? JSON.parse(clinic.modules) : (clinic.modules || {})
    };
};
// ==================== STAFF ====================
export const createClinicAdmin = async (clinicId, userData) => {
    const { email, password, name, phone, role, roles } = userData;
    const finalRoles = roles || (role ? [role] : ['ADMIN']);
    const primaryRole = finalRoles[0].toUpperCase();
    const clinicIds = Array.isArray(userData.clinicIds) && userData.clinicIds.length > 0
        ? Array.from(new Set(userData.clinicIds.map((c) => Number(c)).filter(Boolean)))
        : [clinicId];
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        const hashedPassword = await bcrypt.hash(password, 12);
        user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                phone,
                role: primaryRole
            }
        });
    }
    for (const cid of clinicIds) {
        const exists = await prisma.clinicstaff.findFirst({
            where: { userId: user.id, clinicId: cid }
        });
        if (!exists) {
            await prisma.clinicstaff.create({
                data: {
                    userId: user.id,
                    clinicId: cid,
                    role: primaryRole,
                    roles: JSON.stringify(finalRoles.map((r) => r.toUpperCase()))
                }
            });
        }
    }
    await prisma.auditlog.create({
        data: {
            action: 'Clinic Admin Created',
            performedBy: 'SUPER_ADMIN',
            details: JSON.stringify({ userName: name, clinicIds, roles: finalRoles })
        }
    });
    return {
        id: user.id,
        userId: user.id,
        name: user.name,
        email: user.email,
        role: primaryRole,
        roles: finalRoles.map((r) => r.toUpperCase()),
        clinics: clinicIds,
        status: user.status,
        joined: user.joined
    };
};
export const getAllStaff = async () => {
    const staff = await prisma.clinicstaff.findMany({
        include: {
            user: {
                select: { id: true, name: true, email: true, phone: true, status: true }
            }
        }
    });
    const grouped = new Map();
    staff.forEach((s) => {
        let roles = [s.role];
        try {
            if (s.roles)
                roles = JSON.parse(s.roles);
        }
        catch (e) {
            roles = [s.role];
        }
        const existing = grouped.get(s.userId);
        if (!existing) {
            grouped.set(s.userId, {
                id: s.id,
                userId: s.userId,
                name: s.user.name,
                email: s.user.email,
                phone: s.user.phone,
                role: s.role,
                roles: Array.from(new Set(roles)),
                clinics: [s.clinicId],
                status: s.user.status,
                joined: s.createdAt
            });
            return;
        }
        existing.clinics = Array.from(new Set([...(existing.clinics || []), s.clinicId]));
        existing.roles = Array.from(new Set([...(existing.roles || []), ...roles]));
        if (String(existing.role).toUpperCase() !== 'ADMIN' && String(s.role).toUpperCase() === 'ADMIN') {
            existing.role = 'ADMIN';
        }
    });
    return Array.from(grouped.values());
};
export const updateStaff = async (id, data) => {
    const staff = await prisma.clinicstaff.findUnique({
        where: { id },
        include: { user: true }
    });
    if (!staff)
        throw new AppError('Staff not found', 404);
    const { roles, role, clinicIds } = data;
    const finalRoles = roles || (role ? [role] : undefined);
    const primaryRole = finalRoles ? finalRoles[0].toUpperCase() : undefined;
    if (data.name || data.email || data.phone || primaryRole) {
        await prisma.user.update({
            where: { id: staff.userId },
            data: {
                name: data.name || undefined,
                email: data.email || undefined,
                phone: data.phone || undefined,
                role: primaryRole ? primaryRole : undefined
            }
        });
    }
    const updatedStaff = await prisma.clinicstaff.update({
        where: { id },
        data: {
            role: primaryRole ? primaryRole : undefined,
            roles: finalRoles ? JSON.stringify(finalRoles.map((r) => r.toUpperCase())) : undefined,
            department: data.department || undefined,
            specialty: data.specialty || undefined
        },
        include: { user: true }
    });
    if (Array.isArray(clinicIds)) {
        const targetClinicIds = Array.from(new Set(clinicIds.map((c) => Number(c)).filter(Boolean)));
        const currentRecords = await prisma.clinicstaff.findMany({
            where: { userId: staff.userId }
        });
        const currentClinicIds = currentRecords.map(r => r.clinicId);
        const toAdd = targetClinicIds.filter(cid => !currentClinicIds.includes(cid));
        const toRemove = currentClinicIds.filter(cid => !targetClinicIds.includes(cid));
        if (toRemove.length > 0) {
            await prisma.clinicstaff.deleteMany({
                where: { userId: staff.userId, clinicId: { in: toRemove } }
            });
        }
        for (const cid of toAdd) {
            await prisma.clinicstaff.create({
                data: {
                    userId: staff.userId,
                    clinicId: cid,
                    role: (primaryRole || updatedStaff.role),
                    roles: finalRoles ? JSON.stringify(finalRoles.map((r) => r.toUpperCase())) : updatedStaff.roles
                }
            });
        }
    }
    await prisma.auditlog.create({
        data: {
            action: 'Staff Updated',
            performedBy: 'SUPER_ADMIN',
            details: JSON.stringify({ staffId: id, updates: Object.keys(data) })
        }
    });
    let returnRoles = [updatedStaff.role];
    try {
        if (updatedStaff.roles)
            returnRoles = JSON.parse(updatedStaff.roles);
    }
    catch (e) {
        returnRoles = [updatedStaff.role];
    }
    return {
        id: updatedStaff.id,
        userId: updatedStaff.userId,
        name: updatedStaff.user.name,
        email: updatedStaff.user.email,
        phone: updatedStaff.user.phone,
        role: updatedStaff.role,
        roles: returnRoles,
        clinics: Array.isArray(clinicIds) ? clinicIds.map((c) => Number(c)) : [updatedStaff.clinicId],
        status: updatedStaff.user.status,
        joined: updatedStaff.user.joined ? updatedStaff.user.joined.toISOString().split('T')[0] : null
    };
};
export const deleteStaff = async (id) => {
    await prisma.clinicstaff.delete({ where: { id } });
    await prisma.auditlog.create({
        data: {
            action: 'Staff Deleted',
            performedBy: 'SUPER_ADMIN',
            details: JSON.stringify({ staffId: id })
        }
    });
    return null;
};
export const toggleStaffStatus = async (id) => {
    const staff = await prisma.clinicstaff.findUnique({
        where: { id },
        include: { user: true }
    });
    if (!staff)
        throw new AppError('Staff not found', 404);
    const updatedUser = await prisma.user.update({
        where: { id: staff.userId },
        data: { status: staff.user.status === 'active' ? 'inactive' : 'active' }
    });
    let roles = [staff.role];
    try {
        if (staff.roles)
            roles = JSON.parse(staff.roles);
    }
    catch (e) {
        roles = [staff.role];
    }
    return {
        id: staff.id,
        userId: staff.userId,
        clinicId: staff.clinicId,
        name: updatedUser.name,
        email: updatedUser.email,
        role: staff.role,
        roles: roles,
        department: staff.department,
        specialty: staff.specialty,
        status: updatedUser.status,
        joined: updatedUser.joined ? updatedUser.joined.toISOString().split('T')[0] : null,
        createdAt: staff.createdAt
    };
};
// ==================== DASHBOARD STATS ====================
export const getDashboardStats = async () => {
    const [totalClinics, activeClinics, totalUsers, totalPatients, revenueAgg, pendingSubs] = await Promise.all([
        prisma.clinic.count(),
        prisma.clinic.count({ where: { isActive: true } }),
        prisma.user.count(),
        prisma.patient.count(),
        prisma.subscription_invoice.aggregate({
            where: { status: 'Paid' },
            _sum: { amount: true }
        }),
        prisma.subscription_invoice.count({ where: { status: 'Unpaid' } })
    ]);
    const subscriptionStatus = pendingSubs === 0 ? 'Active' : `${pendingSubs} Pending`;
    return {
        totalClinics,
        activeClinics,
        totalUsers,
        totalPatients,
        totalRevenue: Number(revenueAgg._sum.amount || 0),
        subscriptionStatus
    };
};
// ==================== SYSTEM ALERTS ====================
export const getSystemAlerts = async () => {
    const notifications = await prisma.notification.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' }
    });
    return notifications.map((n) => ({
        id: n.id,
        message: typeof n.message === 'string' ? n.message : JSON.stringify(n.message),
        status: n.status === 'unread' ? 'warn' : 'ok',
        createdAt: n.createdAt
    }));
};
// ==================== AUDIT LOGS ====================
export const getAuditLogs = async (filters) => {
    const { search, action, clinicId, userId, page = 1, limit = 50 } = filters || {};
    const where = {};
    if (search) {
        where.OR = [
            { action: { contains: search } },
            { performedBy: { contains: search } }
        ];
    }
    if (action && action !== 'all') {
        where.action = { contains: action };
    }
    if (clinicId)
        where.clinicId = Number(clinicId);
    if (userId)
        where.userId = Number(userId);
    const [logs, total] = await Promise.all([
        prisma.auditlog.findMany({
            where,
            take: limit,
            skip: (page - 1) * limit,
            orderBy: { timestamp: 'desc' },
            include: {
                clinic: { select: { name: true } }
            }
        }),
        prisma.auditlog.count({ where })
    ]);
    return {
        logs: logs.map(log => ({
            ...log,
            details: log.details ? JSON.parse(log.details) : {}
        })),
        total,
        page,
        totalPages: Math.ceil(total / limit)
    };
};
export const getClinicInsights = async (clinicId) => {
    const [clinic, patients, appointments, revenue] = await Promise.all([
        prisma.clinic.findUnique({
            where: { id: clinicId },
            include: {
                _count: {
                    select: { clinicstaff: true, patient: true, appointment: true }
                }
            }
        }),
        prisma.patient.findMany({ where: { clinicId }, take: 5, orderBy: { createdAt: 'desc' } }),
        prisma.appointment.findMany({ where: { clinicId }, take: 5, orderBy: { date: 'desc' } }),
        prisma.subscription_invoice.aggregate({
            where: { clinicId, status: 'Paid' },
            _sum: { amount: true }
        })
    ]);
    if (!clinic)
        throw new AppError('Clinic not found', 404);
    return {
        clinic,
        recentPatients: patients,
        recentAppointments: appointments,
        totalRevenue: Number(revenue._sum.amount || 0)
    };
};
export const resetClinicAdminPassword = async (userId, password) => {
    const hashedPassword = await bcrypt.hash(password, 12);
    await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword }
    });
    await prisma.auditlog.create({
        data: {
            action: 'Super Admin Reset User Password',
            performedBy: 'SUPER_ADMIN',
            userId: userId,
            details: JSON.stringify({ message: 'Password reset manually by Super Admin' })
        }
    });
    return { success: true };
};
export const updateClinicSubscription = async (id, data) => {
    const { subscriptionPlan, subscriptionDuration, manualDays = 30 } = data;
    const start = new Date();
    const end = new Date();
    if (subscriptionPlan === 'Trial') {
        end.setDate(start.getDate() + 7);
    }
    else if (subscriptionPlan === 'Manual') {
        end.setDate(start.getDate() + Number(manualDays));
    }
    else {
        end.setMonth(start.getMonth() + Number(subscriptionDuration || 1));
    }
    const updated = await prisma.clinic.update({
        where: { id },
        data: {
            subscriptionPlan,
            subscriptionEnd: end
        }
    });
    // Generate new invoice for the renewal
    const totalAmount = Number(data.subscriptionAmount || 0);
    const gstPercent = Number(data.gstPercent || 0);
    const taxAmount = (totalAmount * gstPercent) / 100;
    const finalAmount = totalAmount + taxAmount;
    await prisma.subscription_invoice.create({
        data: {
            clinicId: id,
            invoiceNumber: `RENW-${Date.now()}-${id}`,
            amount: finalAmount,
            status: 'Unpaid',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            description: JSON.stringify({
                base: totalAmount,
                tax: taxAmount,
                percent: gstPercent,
                plan: subscriptionPlan,
                duration: subscriptionDuration,
                note: `${subscriptionPlan} Renewal for ${subscriptionDuration} units`
            })
        }
    });
    return updated;
};
// ==================== SETTINGS ====================
export const getSettings = async () => {
    const settings = await prisma.system_settings.findMany();
    const config = settings.reduce((acc, s) => {
        acc[s.key] = s.value;
        return acc;
    }, {});
    return {
        security: {
            twoFactorEnabled: config.TWO_FACTOR_ENABLED === 'true',
            passwordExpiry: Number(config.PASSWORD_EXPIRY) || 90,
            sessionTimeout: Number(config.SESSION_TIMEOUT) || 30
        },
        smtp: {
            host: config.SMTP_HOST || '',
            port: Number(config.SMTP_PORT) || 587,
            user: config.SMTP_USER || '',
            pass: config.SMTP_PASS || '',
            senderEmail: config.SMTP_FROM || '',
            encryption: config.SMTP_SECURE === 'true' ? 'tls' : 'none'
        },
        system: {
            lastBackup: await prisma.auditlog.findFirst({
                where: { action: 'Database Backup Initiated' },
                orderBy: { timestamp: 'desc' }
            }).then(log => log?.timestamp || null),
            storageUsed: 42,
            storageTotal: 100
        }
    };
};
export const updateSystemSettings = async (category, data) => {
    const updates = [];
    if (category === 'security') {
        updates.push({ key: 'TWO_FACTOR_ENABLED', value: String(data.twoFactorEnabled) }, { key: 'PASSWORD_EXPIRY', value: String(data.passwordExpiry) }, { key: 'SESSION_TIMEOUT', value: String(data.sessionTimeout) });
    }
    else if (category === 'smtp') {
        updates.push({ key: 'SMTP_HOST', value: data.host }, { key: 'SMTP_PORT', value: String(data.port) }, { key: 'SMTP_USER', value: data.user }, { key: 'SMTP_PASS', value: data.pass }, { key: 'SMTP_FROM', value: data.senderEmail }, { key: 'SMTP_SECURE', value: String(data.encryption === 'tls') });
    }
    for (const update of updates) {
        await prisma.system_settings.upsert({
            where: { key: update.key },
            update: { value: update.value, updatedAt: new Date() },
            create: { key: update.key, value: update.value }
        });
    }
    await prisma.auditlog.create({
        data: {
            action: `Super Admin Updated ${category.toUpperCase()} Settings`,
            performedBy: 'SUPER_ADMIN',
            details: JSON.stringify(data)
        }
    });
    return { success: true };
};
export const updateSecuritySettings = async (data) => {
    return updateSystemSettings('security', data);
};
export const getStorageStats = async () => {
    const patientCount = await prisma.patient.count();
    const recordCount = await prisma.medicalrecord.count();
    const baseUsage = 5.2;
    const calculatedUsage = baseUsage + (patientCount * 0.01) + (recordCount * 0.05);
    const total = 100;
    return {
        total,
        used: parseFloat(calculatedUsage.toFixed(2)),
        available: parseFloat((total - calculatedUsage).toFixed(2)),
        percentage: Math.round((calculatedUsage / total) * 100)
    };
};
export const updateInvoiceStatus = async (id, status) => {
    const invoice = await prisma.subscription_invoice.findUnique({
        where: { id },
        include: { clinic: true }
    });
    if (!invoice)
        throw new AppError('Invoice not found', 404);
    const updated = await prisma.subscription_invoice.update({
        where: { id },
        data: {
            status,
            paidDate: status === 'Paid' ? new Date() : null
        }
    });
    await prisma.auditlog.create({
        data: {
            action: 'Invoice Status Updated',
            performedBy: 'SUPER_ADMIN',
            details: JSON.stringify({ invoiceId: id, oldStatus: invoice.status, newStatus: status })
        }
    });
    return updated;
};
export const triggerDatabaseBackup = async () => {
    await prisma.auditlog.create({
        data: {
            action: 'Database Backup Initiated',
            performedBy: 'System',
            details: JSON.stringify({ timestamp: new Date(), status: 'started' })
        }
    });
    return {
        success: true,
        message: 'Database backup initiated successfully',
        estimatedTime: '5-10 minutes'
    };
};
// ==================== PROFILE ====================
export const getUserById = async (userId) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true }
    });
    if (!user)
        throw new AppError('User not found', 404);
    return user;
};
export const updateUserProfile = async (userId, data) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user)
        throw new AppError('User not found', 404);
    const updateData = {};
    if (data.name)
        updateData.name = data.name;
    if (data.email && data.email !== user.email) {
        const existing = await prisma.user.findUnique({ where: { email: data.email } });
        if (existing)
            throw new AppError('Email already in use by another account', 400);
        updateData.email = data.email;
    }
    if (data.newPassword) {
        if (!data.currentPassword)
            throw new AppError('Current password is required to set a new password', 400);
        const isMatch = await bcrypt.compare(data.currentPassword, user.password);
        if (!isMatch)
            throw new AppError('Current password is incorrect', 401);
        updateData.password = await bcrypt.hash(data.newPassword, 12);
    }
    const updated = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: { id: true, name: true, email: true, phone: true, role: true }
    });
    return updated;
};
