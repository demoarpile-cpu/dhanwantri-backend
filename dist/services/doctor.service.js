import { prisma } from '../lib/prisma.js';
import { AppError } from '../utils/AppError.js';
export const getDoctorQueue = async (clinicId, doctorId) => {
    return await prisma.appointment.findMany({
        where: {
            clinicId,
            doctorId,
            queueStatus: 'Checked-In',
            date: {
                gte: new Date(new Date().setHours(0, 0, 0, 0)),
                lte: new Date(new Date().setHours(23, 59, 59, 999))
            }
        },
        include: { patient: true }
    });
};
export const saveCompleteEMR = async (clinicId, doctorId, payload) => {
    const { appointmentId, patientId, assessmentData, prescriptions = [], labRequests = [], radiologyRequests = [], billingAmount } = payload;
    return await prisma.$transaction(async (tx) => {
        // 1. Save Assessment
        const recordTemplateId = assessmentData?.templateId ? Number(assessmentData.templateId) : null;
        await tx.medicalrecord.create({
            data: {
                clinicId,
                patientId,
                doctorId,
                templateId: recordTemplateId,
                type: 'ASSESSMENT',
                data: JSON.stringify(assessmentData || payload.findings || {}),
                isClosed: true
            }
        });
        // 2. Save Prescriptions
        for (const presc of prescriptions) {
            await tx.service_order.create({
                data: {
                    clinicId,
                    patientId,
                    doctorId,
                    type: 'PHARMACY',
                    testName: Array.isArray(presc.items)
                        ? presc.items.map((i) => `${i.medicineName || i.name} x${i.quantity}`).join(', ')
                        : (presc.medicineName || 'Prescription'),
                    amount: presc.totalAmount ? Number(presc.totalAmount) : (presc.amount ? Number(presc.amount) : 0),
                    paymentStatus: 'Pending',
                    testStatus: 'Pending',
                    result: JSON.stringify(presc)
                }
            });
            // Notify Pharmacy
            await tx.notification.create({
                data: {
                    clinicId,
                    department: 'pharmacy',
                    message: JSON.stringify({
                        patientId,
                        type: 'PHARMACY',
                        action: 'NEW_PRESCRIPTION',
                        text: `New prescription for Patient ID: ${patientId}`
                    })
                }
            });
        }
        // 3. Save Lab Requests
        for (const lab of labRequests) {
            const order = await tx.service_order.create({
                data: {
                    clinicId,
                    patientId,
                    doctorId,
                    type: 'LAB',
                    testName: lab.testName,
                    amount: lab.amount ? Number(lab.amount) : 0,
                    paymentStatus: 'Pending',
                    testStatus: 'Pending'
                }
            });
            await tx.notification.create({
                data: {
                    clinicId,
                    department: 'laboratory',
                    message: JSON.stringify({
                        patientId,
                        orderId: order.id,
                        type: 'LAB',
                        action: 'NEW_ORDER',
                        text: `New lab order: ${lab.testName}`
                    })
                }
            });
        }
        // 4. Save Radiology Requests
        for (const rad of radiologyRequests) {
            const order = await tx.service_order.create({
                data: {
                    clinicId,
                    patientId,
                    doctorId,
                    type: 'RADIOLOGY',
                    testName: rad.testName,
                    amount: rad.amount ? Number(rad.amount) : 0,
                    paymentStatus: 'Pending',
                    testStatus: 'Pending'
                }
            });
            await tx.notification.create({
                data: {
                    clinicId,
                    department: 'radiology',
                    message: JSON.stringify({
                        patientId,
                        orderId: order.id,
                        type: 'RADIOLOGY',
                        action: 'NEW_ORDER',
                        text: `New radiology order: ${rad.testName}`
                    })
                }
            });
        }
        // 5. Update appointment status
        if (appointmentId) {
            await tx.appointment.update({
                where: { id: appointmentId },
                data: {
                    status: 'Completed',
                    queueStatus: 'Pending-Payment',
                    billingAmount: billingAmount ? Number(billingAmount) : undefined
                }
            });
            // Update patient status for billing tracking
            await tx.patient.update({
                where: { id: patientId },
                data: { status: 'Pending Payment' }
            });
        }
        return { success: true };
    });
};
export const getHistory = async (clinicId, patientId) => {
    const records = await prisma.medicalrecord.findMany({
        where: { clinicId, patientId },
        include: {
            formtemplate: true,
            patient: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' }
    });
    return records.map(r => ({
        ...r,
        patientName: r.patient?.name || 'Unknown'
    }));
};
export const getPatientFullProfile = async (clinicId, patientId) => {
    const [patient, medicalRecords, serviceOrders, documents, appointments, invoices, medicalReports] = await Promise.all([
        prisma.patient.findUnique({
            where: { id: patientId }
        }),
        prisma.medicalrecord.findMany({
            where: { clinicId, patientId },
            include: { formtemplate: { select: { name: true } } },
            orderBy: { createdAt: 'desc' }
        }),
        prisma.service_order.findMany({
            where: { clinicId, patientId },
            orderBy: { createdAt: 'desc' }
        }),
        prisma.patient_document.findMany({
            where: { clinicId, patientId },
            orderBy: { createdAt: 'desc' }
        }),
        prisma.appointment.findMany({
            where: { clinicId, patientId },
            orderBy: { date: 'desc' }
        }),
        prisma.invoice.findMany({
            where: { clinicId, patientId },
            orderBy: { date: 'desc' }
        }),
        prisma.medical_report.findMany({
            where: { clinicId, patientId },
            include: { template: true },
            orderBy: { reportDate: 'desc' }
        })
    ]);
    if (!patient)
        throw new AppError('Patient not found', 404);
    const clinicalDocs = medicalRecords.filter(r => !['ASSESSMENT', 'NOTE', 'PRESCRIPTION'].includes(r.type)).map(r => {
        const parsedData = r.data && typeof r.data === 'object' ? r.data : (r.data ? JSON.parse(r.data) : {});
        return {
            id: r.id,
            clinicId: r.clinicId,
            patientId: r.patientId,
            type: r.type,
            name: parsedData.fileName || r.type,
            url: parsedData.fileUrl || parsedData.url,
            notes: parsedData.notes,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
            isClinical: true
        };
    });
    return {
        patient,
        medicalRecords: medicalRecords.filter(r => ['ASSESSMENT', 'NOTE', 'PRESCRIPTION'].includes(r.type)).map(r => ({
            ...r,
            data: r.data ? JSON.parse(r.data) : {}
        })),
        serviceOrders: serviceOrders.map(o => ({
            ...o,
            result: o.result && (o.result.startsWith('{') || o.result.startsWith('[')) ? JSON.parse(o.result) : o.result
        })),
        documents: [...documents, ...clinicalDocs],
        appointments,
        invoices,
        medical_reports: medicalReports
    };
};
export const getAllAssessments = async (clinicId, doctorId) => {
    const where = { clinicId };
    if (doctorId) {
        where.doctorId = doctorId;
    }
    const records = await prisma.medicalrecord.findMany({
        where,
        include: {
            formtemplate: true,
            patient: { select: { name: true, id: true } }
        },
        orderBy: { createdAt: 'desc' }
    });
    return records.map(r => ({
        ...r,
        patientName: r.patient?.name || 'Unknown',
        patientId: r.patient?.id,
        visitDate: r.visitDate || r.createdAt,
        date: r.visitDate || r.createdAt,
        status: 'Completed'
    }));
};
export const getDoctorStats = async (clinicId, doctorId) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [todayAppts, totalPatientsCount, completedAppts, pendingAppts] = await Promise.all([
        prisma.appointment.count({
            where: {
                clinicId,
                doctorId,
                status: { in: ['Approved', 'Confirmed', 'Checked In', 'Completed'] },
                date: { gte: today, lte: new Date(new Date().setHours(23, 59, 59, 999)) }
            }
        }),
        prisma.medicalrecord.findMany({
            where: { clinicId, doctorId },
            distinct: ['patientId']
        }).then(res => res.length),
        prisma.appointment.count({
            where: { clinicId, doctorId, status: 'Completed', date: { gte: today } }
        }),
        prisma.appointment.count({
            where: { clinicId, doctorId, status: { in: ['Approved', 'Confirmed', 'Checked In'] }, date: { gte: today } }
        })
    ]);
    return {
        todayPatients: todayAppts,
        totalTreated: totalPatientsCount,
        completedAppointments: completedAppts,
        pendingAppointments: pendingAppts
    };
};
export const getDoctorActivities = async (clinicId, doctorId) => {
    const records = await prisma.medicalrecord.findMany({
        where: { clinicId, doctorId },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { patient: { select: { name: true } } }
    });
    return records.map(r => ({
        id: r.id,
        action: `Completed Assessment for ${r.patient.name}`,
        time: r.createdAt
    }));
};
export const getFormTemplates = async (clinicId) => {
    console.log(`[DOCTOR SERVICE] Fetching templates for Clinic ID: ${clinicId}`);
    // Fetch both clinic-specific and global (null) templates
    const templates = await prisma.formtemplate.findMany({
        where: {
            OR: [
                { clinicId: Number(clinicId) },
                { clinicId: null }
            ],
            status: 'published'
        },
        orderBy: { name: 'asc' }
    });
    // Fallback: If no published templates found, return all available for this clinic (for debugging/setup)
    if (templates.length === 0) {
        return await prisma.formtemplate.findMany({
            where: {
                OR: [
                    { clinicId: Number(clinicId) },
                    { clinicId: null }
                ]
            },
            orderBy: { name: 'asc' }
        });
    }
    return templates;
};
export const getTemplateById = async (clinicId, templateId) => {
    const template = await prisma.formtemplate.findUnique({
        where: { id: templateId }
    });
    if (!template)
        throw new AppError('Template not found', 404);
    // Authorization: Must be global or belong to this clinic
    if (template.clinicId && template.clinicId !== clinicId) {
        throw new AppError('Unauthorized access to this template', 403);
    }
    return {
        ...template,
        fields: typeof template.fields === 'string' ? JSON.parse(template.fields) : template.fields
    };
};
export const getAssignedPatients = async (clinicId, doctorId) => {
    // 1. Get all unique patientIDs that have appointments with this doctor
    const appointments = await prisma.appointment.findMany({
        where: {
            clinicId,
            doctorId
        },
        select: { patientId: true },
        distinct: ['patientId'],
        orderBy: { updatedAt: 'desc' }
    });
    const patientIds = appointments.map(a => a.patientId);
    if (patientIds.length === 0)
        return [];
    // 2. Fetch patient details
    return await prisma.patient.findMany({
        where: {
            id: { in: patientIds },
            clinicId
        },
        include: {
            medicalrecord: {
                where: { clinicId },
                take: 1,
                orderBy: { createdAt: 'desc' },
                select: { createdAt: true, type: true, data: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    });
};
export const getAllClinicPatients = async (clinicId) => {
    return await prisma.patient.findMany({
        where: { clinicId },
        include: {
            medicalrecord: {
                where: { clinicId },
                take: 1,
                orderBy: { createdAt: 'desc' },
                select: { createdAt: true, type: true, data: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    });
};
export const getDoctorOrders = async (clinicId, doctorId) => {
    const orders = await prisma.service_order.findMany({
        where: {
            clinicId,
            doctorId
        },
        include: {
            patient: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' }
    });
    return orders.map(o => {
        let parsedResult = {};
        try {
            parsedResult = o.result ? JSON.parse(o.result) : {};
        }
        catch (e) {
            console.error("Failed to parse order result:", e);
        }
        return {
            id: o.id,
            date: o.createdAt,
            patientName: o.patient?.name || 'Unknown',
            type: o.type,
            details: o.testName,
            status: o.testStatus || 'Pending',
            priority: o.paymentStatus, // Using paymentStatus which often reflects priority in this DB or use a specific field if available
            result: parsedResult
        };
    });
};
export const createOrder = async (clinicId, doctorId, data) => {
    const { patientId, type, items, priority, notes, date } = data;
    // Normalize type
    let orderType = 'LAB';
    if (type.toLowerCase().includes('rad'))
        orderType = 'RADIOLOGY';
    if (type.toLowerCase().includes('presc') || type.toLowerCase().includes('pharm'))
        orderType = 'PHARMACY';
    let testName = typeof items === 'string' ? items : '';
    let resultPayload = { priority, notes, date };
    if (orderType === 'PHARMACY' && Array.isArray(items) && items.length > 0) {
        const prescriptionItems = items.map((i) => ({
            inventoryId: i.inventoryId,
            medicineName: i.medicineName || i.name,
            quantity: Number(i.quantity) || 1,
            unitPrice: Number(i.unitPrice) || 0
        }));
        testName = prescriptionItems.map((i) => `${i.medicineName} x${i.quantity}`).join(', ');
        resultPayload.items = prescriptionItems;
    }
    const order = await prisma.service_order.create({
        data: {
            clinicId,
            patientId: Number(patientId),
            doctorId,
            type: orderType,
            testName: testName || (typeof items === 'string' ? items : 'Prescription'),
            testStatus: 'Pending',
            paymentStatus: 'Pending',
            result: JSON.stringify(resultPayload)
        }
    });
    // Notify Department
    let dept = 'laboratory';
    if (orderType === 'RADIOLOGY')
        dept = 'radiology';
    if (orderType === 'PHARMACY')
        dept = 'pharmacy';
    await prisma.notification.create({
        data: {
            clinicId,
            department: dept,
            message: JSON.stringify({ patientId, orderId: order.id, type: orderType, items, priority, notes })
        }
    });
    return order;
};
export const getRevenueStats = async (clinicId, doctorId) => {
    // 1. Get all invoices for this doctor that are paid
    const paidInvoices = await prisma.invoice.findMany({
        where: {
            clinicId,
            doctorId,
            status: 'Paid'
        },
        select: { totalAmount: true, date: true, createdAt: true }
    });
    // 2. Get all invoices for this doctor that are pending (for outstanding info if needed, but the current return structure doesn't include it)
    // We'll focus on the requested return structure
    const totalEarnings = paidInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
    const totalConsultations = await prisma.appointment.count({
        where: { clinicId, doctorId, status: 'Completed' }
    });
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const todayStr = today.toISOString().split('T')[0];
    let thisMonth = 0;
    let todayEarned = 0;
    // Daily buckets for chart
    const dailyMap = new Map();
    paidInvoices.forEach(inv => {
        const d = new Date(inv.date || inv.createdAt);
        const dateStr = d.toISOString().split('T')[0];
        // Chart data
        dailyMap.set(dateStr, (dailyMap.get(dateStr) || 0) + Number(inv.totalAmount || 0));
        // Stats
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
            thisMonth += Number(inv.totalAmount || 0);
        }
        if (dateStr === todayStr) {
            todayEarned += Number(inv.totalAmount || 0);
        }
    });
    // Format chart data (last 7 active days or just map entries)
    const chartData = Array.from(dailyMap.entries())
        .map(([date, earnings]) => ({ date, earnings }))
        .sort((a, b) => a.date.localeCompare(b.date));
    return {
        totalEarnings,
        thisMonth,
        today: todayEarned,
        totalConsultations,
        totalOutstanding: (await prisma.invoice.aggregate({
            where: { clinicId, doctorId, status: 'Pending' },
            _sum: { totalAmount: true }
        }))._sum.totalAmount || 0,
        chartData
    };
};
