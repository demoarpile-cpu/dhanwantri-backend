import { prisma } from '../lib/prisma.js';
import { AppError } from '../utils/AppError.js';
import bcrypt from 'bcryptjs';

export const getClinicStats = async (clinicId: number) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [doctorCount, staffCount, todayAppts, totalPatients, todayRevenue, pendingBills, totalRevenue] = await Promise.all([
        prisma.clinicstaff.count({ where: { clinicId, role: 'DOCTOR' } }),
        prisma.clinicstaff.count({ where: { clinicId } }),
        prisma.appointment.count({
            where: {
                clinicId,
                date: { gte: today, lt: tomorrow }
            }
        }),
        prisma.patient.count({ where: { clinicId } }),
        prisma.invoice.aggregate({
            where: { clinicId, status: 'Paid', date: { gte: today, lt: tomorrow } },
            _sum: { totalAmount: true }
        }),
        prisma.invoice.count({ where: { clinicId, status: 'Pending' } }),
        prisma.invoice.aggregate({
            where: { clinicId, status: 'Paid' },
            _sum: { totalAmount: true }
        })
    ]);

    return {
        totalDoctors: doctorCount,
        totalStaff: staffCount,
        todayAppointments: todayAppts,
        totalPatients,
        todayRevenue: Number(todayRevenue._sum.totalAmount || 0),
        pendingBills,
        revenue: Number(totalRevenue._sum.totalAmount || 0)
    };
};

export const getClinicContext = async (clinicId: number) => {
    const clinic = await prisma.clinic.findUnique({
        where: { id: clinicId }
    });
    if (!clinic) throw new AppError('Clinic not found', 404);

    let modules = { pharmacy: true, radiology: true, laboratory: true, billing: true };
    if (clinic.modules) {
        try {
            modules = typeof clinic.modules === 'string' ? JSON.parse(clinic.modules) : clinic.modules;
        } catch (e) {
            console.error('Failed to parse clinic modules:', e);
        }
    }

    return {
        id: clinic.id,
        name: clinic.name,
        location: clinic.location,
        contact: clinic.contact,
        email: clinic.email,
        subdomain: clinic.subdomain,
        modules,
        brandingColor: clinic.brandingColor,
        status: clinic.status,
        documentTypes: clinic.documentTypes ? JSON.parse(clinic.documentTypes) : null
    };
};

export const updateClinic = async (clinicId: number, data: any) => {
    const { name, location, contact, email, documentTypes, brandingColor } = data;

    const updated = await prisma.clinic.update({
        where: { id: clinicId },
        data: {
            name: name || undefined,
            location: location || undefined,
            contact: contact || undefined,
            email: email || undefined,
            brandingColor: brandingColor || undefined,
            documentTypes: documentTypes ? JSON.stringify(documentTypes) : undefined
        }
    });

    await prisma.auditlog.create({
        data: {
            action: 'Clinic Details Updated',
            performedBy: 'ADMIN',
            clinicId,
            details: JSON.stringify({ updates: Object.keys(data) })
        }
    });

    return {
        ...updated,
        documentTypes: updated.documentTypes ? JSON.parse(updated.documentTypes) : null
    };
};

export const getClinicActivities = async (clinicId: number) => {
    const logs = await prisma.auditlog.findMany({
        where: { clinicId },
        take: 10,
        orderBy: { timestamp: 'desc' }
    });

    return logs.map(log => ({
        id: log.id,
        action: log.action,
        user: log.performedBy,
        time: log.timestamp,
        details: log.details
    }));
};

export const getClinicStaff = async (clinicId: number) => {
    const staffRecords = await prisma.clinicstaff.findMany({
        where: {
            clinicId,
            role: { not: 'SUPER_ADMIN' }
        },
        include: {
            user: true
        }
    });

    return staffRecords.map(record => {
        let roles = [];
        try {
            roles = record.roles ? JSON.parse(record.roles) : [record.role];
        } catch (e) {
            roles = [record.role];
        }

        return {
            id: record.id,
            userId: record.userId,
            clinicId: record.clinicId,
            name: (record.user as any).name,
            email: (record.user as any).email,
            phone: (record.user as any).phone,
            status: (record.user as any).status,
            joined: (record.user as any).joined ? (record.user as any).joined.toISOString().split('T')[0] : null,
            role: record.role,
            roles: roles,
            department: record.department,
            specialty: record.specialty
        };
    });
};

export const addStaff = async (clinicId: number, data: any) => {
    try {
        const { email, password, name, roles, phone, department, specialty } = data;

        // Map common variations to valid Enum values
        let primaryRoleRaw = (roles && roles.length > 0) ? roles[0].toUpperCase() : 'RECEPTIONIST';
        if (primaryRoleRaw === 'LABORATORY') primaryRoleRaw = 'LAB';
        if (primaryRoleRaw === 'PHARMACIST') primaryRoleRaw = 'PHARMACY';

        const primaryRole = primaryRoleRaw;

        console.log(`[STAFF_SERVICE] Adding staff: ${email} to clinic ${clinicId} with role ${primaryRole}`);

        // Check if user exists
        let user: any = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            if (!password) throw new AppError('Password is required for new users', 400);
            const hashedPassword = await bcrypt.hash(password, 12);
            user = await prisma.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    name,
                    phone,
                    status: 'active',
                    role: primaryRole as any
                }
            });
            console.log(`[STAFF_SERVICE] Created new user with ID: ${user.id}`);
        } else {
            // Update user's phone and primary role
            user = await prisma.user.update({
                where: { id: user.id },
                data: {
                    phone: phone || undefined,
                    role: primaryRole as any
                }
            });
            console.log(`[STAFF_SERVICE] Linked existing user id: ${user.id}`);
        }

        // Check if staff already exists in this clinic
        const existing = await prisma.clinicstaff.findFirst({
            where: {
                userId: user.id,
                clinicId
            }
        });

        if (existing) throw new AppError('User is already a staff member in this clinic', 400);

        const newStaff: any = await prisma.clinicstaff.create({
            data: {
                userId: user.id,
                clinicId,
                role: primaryRole as any,
                roles: JSON.stringify(roles || [primaryRole]),
                department,
                specialty
            },
            include: {
                user: true
            }
        });

        await prisma.auditlog.create({
            data: {
                action: 'Staff Added',
                performedBy: 'ADMIN',
                userId: user.id,
                clinicId,
                details: JSON.stringify({ name: user.name, roles, department })
            }
        });

        return {
            id: newStaff.id,
            userId: newStaff.userId,
            clinicId: newStaff.clinicId,
            name: newStaff.user?.name || user.name,
            email: newStaff.user?.email || user.email,
            role: newStaff.role,
            roles: roles || [newStaff.role],
            department: newStaff.department,
            specialty: newStaff.specialty,
            status: newStaff.user?.status || 'active',
            joined: newStaff.user?.joined ? newStaff.user.joined.toISOString().split('T')[0] : null,
            createdAt: newStaff.createdAt
        };
    } catch (error: any) {
        console.error(`[STAFF_SERVICE_ERROR] Failed to add staff:`, error);
        if (error instanceof AppError) throw error;

        if (error.code === 'P2002') {
            throw new AppError('A staff member with this information already exists', 400);
        }

        // Handle potential enum or database errors specifically to avoid 500
        if (error.message && (error.message.includes('not found in enum') || error.message.includes('Unknown argument'))) {
            throw new AppError(`Invalid role or data field selected: ${error.message}`, 400);
        }

        throw new AppError(`Staff creation failed: ${error.message}`, 500);
    }
};


export const updateStaff = async (clinicId: number, staffId: number, data: any) => {
    const { name, email, phone, roles, department, specialty, status } = data;
    const primaryRole = (roles && roles.length > 0) ? roles[0].toUpperCase() : undefined;

    const staff = await prisma.clinicstaff.findUnique({
        where: { id: staffId },
        include: { user: true }
    });

    if (!staff) throw new AppError('Staff record not found', 404);
    if (staff.clinicId !== clinicId) throw new AppError('Unauthorized: Staff does not belong to this clinic', 403);

    // Update user info if name/email/phone/status/role changed
    if (name || email || phone || status || primaryRole) {
        await prisma.user.update({
            where: { id: staff.userId },
            data: {
                name: name || undefined,
                email: email || undefined,
                phone: phone || undefined,
                status: status || undefined,
                role: primaryRole ? primaryRole as any : undefined
            }
        });
    }

    // Update staff info
    const updatedStaff = await prisma.clinicstaff.update({
        where: { id: staffId },
        data: {
            role: primaryRole ? primaryRole as any : undefined,
            roles: roles ? JSON.stringify(roles) : undefined,
            department: department || undefined,
            specialty: specialty || undefined
        },
        include: {
            user: true
        }
    });

    await prisma.auditlog.create({
        data: {
            action: 'Staff Updated',
            performedBy: 'ADMIN',
            userId: staff.userId,
            clinicId: staff.clinicId,
            details: JSON.stringify({ staffId, updates: Object.keys(data) })
        }
    });

    let finalRoles = [];
    try {
        finalRoles = updatedStaff.roles ? JSON.parse(updatedStaff.roles) : [updatedStaff.role];
    } catch (e) {
        finalRoles = [updatedStaff.role];
    }

    return {
        id: updatedStaff.id,
        userId: updatedStaff.userId,
        clinicId: updatedStaff.clinicId,
        name: (updatedStaff.user as any).name,
        email: (updatedStaff.user as any).email,
        phone: (updatedStaff.user as any).phone,
        role: updatedStaff.role,
        roles: finalRoles,
        department: updatedStaff.department,
        specialty: updatedStaff.specialty,
        status: (updatedStaff.user as any).status,
        joined: (updatedStaff.user as any).joined ? (updatedStaff.user as any).joined.toISOString().split('T')[0] : null,
        createdAt: updatedStaff.createdAt
    };
};

export const deleteClinicStaff = async (clinicId: number, staffId: number, userRole?: string) => {
    const staff = await prisma.clinicstaff.findUnique({
        where: { id: staffId }
    });

    if (!staff) throw new AppError('Staff record not found', 404);

    // Super admins can delete staff from any clinic, regular admins can only delete from their own clinic
    if (userRole !== 'SUPER_ADMIN' && staff.clinicId !== clinicId) {
        throw new AppError('Unauthorized: Staff does not belong to this clinic', 403);
    }

    const actualClinicId = staff.clinicId;

    await prisma.$transaction(async (tx) => {
        // 1. Check if user has other clinic associations
        const otherAssociations = await tx.clinicstaff.count({
            where: { userId: staff.userId, id: { not: staffId } }
        });

        // 2. Delete the specific clinic staff record
        await tx.clinicstaff.delete({
            where: { id: staffId }
        });

        // 3. If no other associations, delete user and their audit logs
        if (otherAssociations === 0) {
            // Delete audit logs first to satisfy foreign key constraints
            await tx.auditlog.deleteMany({
                where: { userId: staff.userId }
            });

            // Delete the user record
            await tx.user.delete({
                where: { id: staff.userId }
            });
        }

        // 4. Log the action (using clinic context if still exists, or global)
        await tx.auditlog.create({
            data: {
                action: 'Staff Deleted',
                performedBy: userRole === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'ADMIN',
                clinicId: actualClinicId,
                details: JSON.stringify({
                    staffId,
                    userId: staff.userId,
                    note: otherAssociations === 0 ? 'User and AuditLogs deleted' : 'Staff unlinked, user preserved'
                })
            }
        });
    });

    return { success: true };
};

export const getFormTemplates = async (clinicId: number) => {
    return await prisma.formtemplate.findMany({
        where: {
            OR: [
                { clinicId: clinicId },
                { clinicId: null }
            ]
        },
        orderBy: { name: 'asc' }
    });
};

export const createFormTemplate = async (clinicId: number, data: any) => {
    const { name, specialty, fields, status, doctorId } = data;
    const template = await prisma.formtemplate.create({
        data: {
            clinicId,
            name,
            specialty: specialty || 'General',
            fields: typeof fields === 'string' ? fields : JSON.stringify(fields),
            status: status || 'published',
            doctorId: doctorId ? Number(doctorId) : null
        }
    });

    await prisma.auditlog.create({
        data: {
            action: 'Form Template Created',
            performedBy: 'ADMIN',
            clinicId,
            details: JSON.stringify({ templateId: template.id, name })
        }
    });

    return template;
};

export const deleteFormTemplate = async (id: number) => {
    const template = await prisma.formtemplate.delete({
        where: { id }
    });

    await prisma.auditlog.create({
        data: {
            action: 'Form Template Deleted',
            performedBy: 'ADMIN',
            clinicId: template.clinicId,
            details: JSON.stringify({ templateId: id, name: template.name })
        }
    });

    return template;
};

const DEFAULT_BOOKING_CONFIG = {
    enabled: true,
    services: ['Consultation', 'Follow-up', 'Emergency'],
    timeSlots: ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00'],
    selectedDoctors: [],
    offDays: [0, 6],
    holidays: [],
    doctorAvailability: {} as Record<string, { offDays: number[]; timeSlots: string[] }>
};

/** Get availability (days + time slots) for a specific doctor. Falls back to clinic default if not set. */
export const getDoctorAvailability = async (clinicId: number, doctorId: number) => {
    const config = await getBookingConfig(clinicId);
    const doctorConfig = (config.doctorAvailability || {})[String(doctorId)];
    return {
        offDays: doctorConfig?.offDays ?? config.offDays ?? [0, 6],
        timeSlots: (doctorConfig?.timeSlots?.length ? doctorConfig.timeSlots : config.timeSlots) ?? DEFAULT_BOOKING_CONFIG.timeSlots
    };
};

export const getBookingConfig = async (clinicId: number) => {
    const clinic = await prisma.clinic.findUnique({
        where: { id: clinicId },
        select: { bookingConfig: true }
    });
    if (clinic?.bookingConfig) {
        try {
            return JSON.parse(clinic.bookingConfig);
        } catch {
            return DEFAULT_BOOKING_CONFIG;
        }
    }
    return DEFAULT_BOOKING_CONFIG;
};

export const updateBookingConfig = async (clinicId: number, config: any) => {
    const updated = await prisma.clinic.update({
        where: { id: clinicId },
        data: {
            bookingConfig: JSON.stringify(config)
        },
        select: { bookingConfig: true }
    });

    await prisma.auditlog.create({
        data: {
            action: 'Booking Config Updated',
            performedBy: 'ADMIN',
            clinicId,
            details: JSON.stringify({ config })
        }
    });

    return updated.bookingConfig ? JSON.parse(updated.bookingConfig) : null;
};

export const resetUserPassword = async (clinicId: number, userId: number, password: string) => {
    const staff = await prisma.clinicstaff.findFirst({
        where: { userId, clinicId }
    });
    if (!staff) throw new AppError('User does not belong to this clinic', 403);

    const hashedPassword = await bcrypt.hash(password, 12);
    await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword }
    });

    await prisma.auditlog.create({
        data: {
            action: 'Password Reset',
            performedBy: 'ADMIN',
            userId: userId,
            clinicId,
            details: JSON.stringify({ note: 'Admin reset password' })
        }
    });

    return { success: true };
};

export const getClinicServices = async (clinicId: number) => {
    return await prisma.clinic_service.findMany({
        where: { clinicId },
        orderBy: { name: 'asc' }
    });
};

export const createClinicService = async (clinicId: number, data: any) => {
    const { name, description, price, type, isActive } = data;
    const service = await prisma.clinic_service.create({
        data: {
            clinicId,
            name,
            description,
            price: price || 0,
            type: type || 'OTHER',
            isActive: isActive !== undefined ? isActive : true
        }
    });

    await prisma.auditlog.create({
        data: {
            action: 'Service Created',
            performedBy: 'ADMIN',
            clinicId,
            details: JSON.stringify({ serviceId: service.id, name, type, price })
        }
    });

    return service;
};

export const updateClinicService = async (clinicId: number, serviceId: number, data: any) => {
    const { name, description, price, type, isActive } = data;

    // Verify it belongs to clinic
    const existing = await prisma.clinic_service.findFirst({
        where: { id: serviceId, clinicId }
    });
    if (!existing) throw new AppError('Service not found or unauthorized', 404);

    const service = await prisma.clinic_service.update({
        where: { id: serviceId },
        data: {
            name: name ?? existing.name,
            description: description !== undefined ? description : existing.description,
            price: price !== undefined ? price : existing.price,
            type: type ?? existing.type,
            isActive: isActive !== undefined ? isActive : existing.isActive
        }
    });

    await prisma.auditlog.create({
        data: {
            action: 'Service Updated',
            performedBy: 'ADMIN',
            clinicId,
            details: JSON.stringify({ serviceId, updates: data })
        }
    });

    return service;
};

export const deleteClinicService = async (clinicId: number, serviceId: number) => {
    const existing = await prisma.clinic_service.findFirst({
        where: { id: serviceId, clinicId }
    });
    if (!existing) throw new AppError('Service not found or unauthorized', 404);

    await prisma.clinic_service.delete({
        where: { id: serviceId }
    });

    await prisma.auditlog.create({
        data: {
            action: 'Service Deleted',
            performedBy: 'ADMIN',
            clinicId,
            details: JSON.stringify({ serviceId, name: existing.name })
        }
    });

    return { success: true };
};
