import { prisma } from '../lib/prisma.js';
export const getDashboardStats = async (role, clinicId, userId) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const normalizedRole = role.toUpperCase();
    // Stats for SUPER_ADMIN
    if (normalizedRole === 'SUPER_ADMIN') {
        const [totalClinics, activeClinics, totalUsers, revenueAgg, pendingSubs] = await Promise.all([
            prisma.clinic.count(),
            prisma.clinic.count({ where: { isActive: true } }),
            prisma.user.count(),
            prisma.subscription_invoice.aggregate({
                where: { status: 'Paid' },
                _sum: { amount: true }
            }),
            prisma.subscription_invoice.count({ where: { status: 'Unpaid' } })
        ]);
        return {
            totalClinics,
            activeClinics,
            totalUsers,
            revenue: Number(revenueAgg._sum.amount || 0),
            subscriptionStatus: pendingSubs === 0 ? 'Active' : `${pendingSubs} Pending`
        };
    }
    // Common clinicId check for other roles
    if (!clinicId)
        return {};
    // Stats for ADMIN
    if (normalizedRole === 'ADMIN') {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const dayBeforeYesterday = new Date(yesterday);
        dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 1);
        const [totalStaff, totalPatients, todayAppts, yesterdayAppts, todayRevenueAgg, pendingBillsAgg, totalAppts, pendingBillsCount] = await Promise.all([
            prisma.clinicstaff.count({ where: { clinicId } }),
            prisma.patient.count({ where: { clinicId } }),
            prisma.appointment.count({ where: { clinicId, date: { gte: today, lt: tomorrow } } }),
            prisma.appointment.count({ where: { clinicId, date: { gte: yesterday, lt: today } } }),
            prisma.invoice.aggregate({
                where: { clinicId, status: 'Paid', date: { gte: today, lt: tomorrow } },
                _sum: { totalAmount: true }
            }),
            prisma.invoice.aggregate({
                where: { clinicId, status: 'Pending' },
                _sum: { totalAmount: true }
            }),
            prisma.appointment.count({ where: { clinicId } }),
            prisma.invoice.count({ where: { clinicId, status: 'Pending' } })
        ]);
        // Dynamic Calculations
        const growth = yesterdayAppts === 0 ? (todayAppts > 0 ? 100 : 0) : Math.round(((todayAppts - yesterdayAppts) / yesterdayAppts) * 100);
        const capacity = (totalStaff || 1) * 8; // Assume 8 slots per staff per day
        const utilization = Math.min(100, Math.round((todayAppts / capacity) * 100));
        const systemStatus = pendingBillsCount > 50 ? 'Review Needed' : 'Healthy';
        return {
            totalStaff,
            totalPatients,
            todayAppointments: todayAppts,
            totalAppointments: totalAppts,
            todayRevenue: Number(todayRevenueAgg._sum.totalAmount || 0),
            pendingBills: Number(pendingBillsAgg._sum.totalAmount || 0),
            growth,
            utilization,
            systemStatus
        };
    }
    // Stats for DOCTOR
    if (normalizedRole === 'DOCTOR') {
        const staff = await prisma.clinicstaff.findFirst({ where: { userId: userId, clinicId } });
        const doctorId = staff?.id || 0;
        const [todayAppts, totalTreated, completedAppts, pendingAppts] = await Promise.all([
            prisma.appointment.count({ where: { clinicId, doctorId, date: { gte: today, lt: tomorrow } } }),
            prisma.medicalrecord.findMany({ where: { clinicId, doctorId }, distinct: ['patientId'] }).then(r => r.length),
            prisma.appointment.count({ where: { clinicId, doctorId, status: 'Completed', date: { gte: today, lt: tomorrow } } }),
            prisma.appointment.count({ where: { clinicId, doctorId, status: { in: ['Approved', 'Confirmed', 'Checked In'] }, date: { gte: today, lt: tomorrow } } })
        ]);
        return {
            todayPatients: todayAppts,
            totalTreated,
            completedAppointments: completedAppts,
            pendingAppointments: pendingAppts,
            earnings: totalTreated * 350 // Estimated
        };
    }
    // Stats for RECEPTIONIST
    if (normalizedRole === 'RECEPTIONIST') {
        const { getReceptionStats } = await import('./reception.service.js');
        return await getReceptionStats(clinicId);
    }
    // Stats for PHARMACY
    if (normalizedRole === 'PHARMACY') {
        const [pendingPrescriptions, medicineSaleToday, lowStock, totalInventoryItems] = await Promise.all([
            prisma.service_order.count({ where: { clinicId, type: 'PHARMACY', testStatus: 'Pending' } }),
            prisma.invoice.aggregate({
                where: { clinicId, status: 'Paid', date: { gte: today, lt: tomorrow } },
                _sum: { totalAmount: true }
            }),
            prisma.inventory.count({ where: { clinicId, quantity: { lt: 10 } } }),
            prisma.inventory.count({ where: { clinicId } })
        ]);
        const dispensedToday = await prisma.service_order.count({
            where: { clinicId, type: 'PHARMACY', testStatus: 'Completed', updatedAt: { gte: today, lt: tomorrow } }
        });
        return {
            prescriptionsToday: pendingPrescriptions + dispensedToday,
            dispensedToday,
            lowStock,
            totalItems: totalInventoryItems,
            medicineSaleToday: Number(medicineSaleToday._sum.totalAmount || 0)
        };
    }
    // Stats for LAB
    if (normalizedRole === 'LAB' || normalizedRole === 'LABORATORY') {
        const [pending, completedToday] = await Promise.all([
            prisma.service_order.count({ where: { clinicId, type: 'LAB', testStatus: 'Pending' } }),
            prisma.service_order.count({ where: { clinicId, type: 'LAB', testStatus: 'Completed', updatedAt: { gte: today, lt: tomorrow } } })
        ]);
        return {
            pending,
            uploadedToday: completedToday
        };
    }
    // Stats for RADIOLOGY
    if (normalizedRole === 'RADIOLOGY' || normalizedRole === 'RADIOLOGIST') {
        const [pending, completedToday] = await Promise.all([
            prisma.service_order.count({ where: { clinicId, type: 'RADIOLOGY', testStatus: 'Pending' } }),
            prisma.service_order.count({ where: { clinicId, type: 'RADIOLOGY', testStatus: 'Completed', updatedAt: { gte: today, lt: tomorrow } } })
        ]);
        return {
            pending,
            completedToday
        };
    }
    // Stats for ACCOUNTANT
    if (normalizedRole === 'ACCOUNTANT' || normalizedRole === 'ACCOUNTING') {
        const [pendingInvoices, incomeToday, totalRevenue, unpaidTotal, recentInvoices] = await Promise.all([
            prisma.invoice.count({ where: { clinicId, status: 'Pending' } }),
            prisma.invoice.aggregate({
                where: { clinicId, status: 'Paid', updatedAt: { gte: today, lt: tomorrow } },
                _sum: { totalAmount: true }
            }),
            prisma.invoice.aggregate({
                where: { clinicId, status: 'Paid' },
                _sum: { totalAmount: true }
            }),
            prisma.invoice.aggregate({
                where: { clinicId, status: 'Pending' },
                _sum: { totalAmount: true }
            }),
            prisma.invoice.findMany({
                where: { clinicId },
                take: 10,
                orderBy: { createdAt: 'desc' },
                include: { patient: { select: { name: true } } }
            })
        ]);
        return {
            pendingInvoices,
            incomeToday: Number(incomeToday._sum.totalAmount || 0),
            totalRevenue: Number(totalRevenue._sum.totalAmount || 0),
            unpaidTotal: Number(unpaidTotal._sum.totalAmount || 0),
            invoices: recentInvoices
        };
    }
    // Stats for PATIENT
    if (normalizedRole === 'PATIENT') {
        const [myAppts, myRecords, myReports, myBilling] = await Promise.all([
            prisma.appointment.count({ where: { patientId: userId } }),
            prisma.medicalrecord.count({ where: { patientId: userId } }),
            prisma.service_order.count({ where: { patientId: userId, testStatus: 'Completed' } }),
            prisma.invoice.count({ where: { patientId: userId, status: 'Pending' } })
        ]);
        return {
            myAppointments: myAppts,
            myMedicalRecords: myRecords,
            myLabReports: myReports,
            pendingBills: myBilling
        };
    }
    // Stats for DOCUMENT_CONTROLLER
    if (normalizedRole === 'DOCUMENT_CONTROLLER') {
        const [total, pending] = await Promise.all([
            prisma.medicalrecord.count({ where: { clinicId } }),
            prisma.medicalrecord.count({ where: { clinicId, isClosed: false } })
        ]);
        return {
            total,
            pending,
            completed: total - pending
        };
    }
    return {};
};
