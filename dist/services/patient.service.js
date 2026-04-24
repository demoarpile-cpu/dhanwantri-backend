import { prisma } from '../lib/prisma.js';
import { AppError } from '../utils/AppError.js';
import bcrypt from 'bcryptjs';
export const getMyAppointments = async (userId, email, clinicId) => {
    const whereClause = {
        OR: [
            { email: email },
        ]
    };
    if (clinicId)
        whereClause.clinicId = clinicId;
    const patientRecords = await prisma.patient.findMany({
        where: whereClause,
        select: { id: true, clinicId: true }
    });
    const patientIds = patientRecords.map(p => p.id);
    if (patientIds.length === 0) {
        return [];
    }
    const appointmentWhere = { patientId: { in: patientIds } };
    if (clinicId)
        appointmentWhere.clinicId = clinicId;
    const appointments = await prisma.appointment.findMany({
        where: appointmentWhere,
        include: {
            clinic: { select: { name: true } },
            doctor: {
                include: {
                    user: { select: { name: true } }
                }
            }
        },
        orderBy: {
            date: 'desc'
        }
    });
    // Flatten doctor name for frontend convenience
    return appointments.map((app) => ({
        ...app,
        doctor: app.doctor ? {
            ...app.doctor,
            name: app.doctor.user?.name
        } : null
    }));
};
export const cancelAppointment = async (appointmentId, email) => {
    const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: { patient: { select: { email: true } } }
    });
    if (!appointment) {
        throw new AppError('Appointment not found', 404);
    }
    if (appointment.patient.email !== email) {
        throw new AppError('Unauthorized to cancel this appointment', 403);
    }
    return await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: 'Cancelled' }
    });
};
export const getMyMedicalRecords = async (userId, email, clinicId) => {
    const whereClause = { email: email };
    if (clinicId)
        whereClause.clinicId = clinicId;
    const patientRecords = await prisma.patient.findMany({
        where: whereClause,
        select: { id: true }
    });
    const patientIds = patientRecords.map(p => p.id);
    if (patientIds.length === 0)
        return { assessments: [], serviceOrders: [], prescriptions: [], medical_reports: [] };
    const recordsWhere = { patientId: { in: patientIds } };
    if (clinicId)
        recordsWhere.clinicId = clinicId;
    const [records, serviceOrders, pRecords, dRecords, medicalReports] = await Promise.all([
        prisma.medicalrecord.findMany({
            where: {
                ...recordsWhere,
                type: { in: ['ASSESSMENT', 'NOTE'] }
            },
            include: {
                clinic: { select: { name: true } },
                formtemplate: { select: { name: true, fields: true } }
            },
            orderBy: { visitDate: 'desc' }
        }),
        prisma.service_order.findMany({
            where: {
                ...recordsWhere,
                testStatus: 'Completed'
            },
            include: {
                clinic: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        }),
        prisma.medicalrecord.findMany({
            where: {
                ...recordsWhere,
                type: 'PRESCRIPTION'
            },
            include: {
                clinic: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        }),
        prisma.medicalrecord.findMany({
            where: {
                ...recordsWhere,
                type: { notIn: ['ASSESSMENT', 'NOTE', 'PRESCRIPTION'] }
            },
            include: {
                clinic: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        }),
        prisma.medical_report.findMany({
            where: recordsWhere,
            include: {
                clinic: { select: { name: true } },
                template: true
            },
            orderBy: { reportDate: 'desc' }
        })
    ]);
    return {
        assessments: records.map(record => ({
            ...record,
            data: record.data ? JSON.parse(record.data) : {}
        })),
        serviceOrders: serviceOrders,
        prescriptions: pRecords.map(p => ({
            ...p,
            data: p.data ? JSON.parse(p.data) : {}
        })),
        documents: dRecords.map(d => ({
            ...d,
            data: d.data ? JSON.parse(d.data) : {}
        })),
        medical_reports: medicalReports
    };
};
export const getMyDocuments = async (email, clinicId) => {
    const whereClause = { email };
    if (clinicId)
        whereClause.clinicId = clinicId;
    const patients = await prisma.patient.findMany({
        where: whereClause,
        select: { id: true }
    });
    const patientIds = patients.map(p => p.id);
    const docWhere = { patientId: { in: patientIds } };
    if (clinicId)
        docWhere.clinicId = clinicId;
    return await prisma.patient_document.findMany({
        where: docWhere,
        include: { clinic: { select: { name: true } } },
        orderBy: { createdAt: 'desc' }
    });
};
export const uploadPatientDocument = async (clinicId, data) => {
    const { patientId, type, name, url } = data;
    if (!patientId)
        throw new AppError('Patient ID is required', 400);
    if (!name)
        throw new AppError('Document name is required', 400);
    if (!url)
        throw new AppError('Document URL is required', 400);
    return await prisma.patient_document.create({
        data: {
            clinicId,
            patientId: Number(patientId),
            type: type || 'OTHER',
            name,
            url
        }
    });
};
export const getPatientDocuments = async (clinicId, patientId) => {
    return await prisma.patient_document.findMany({
        where: {
            clinicId,
            patientId
        },
        orderBy: { createdAt: 'desc' }
    });
};
export const deletePatientDocument = async (recordId, clinicId, userEmail, userRole, tableHint) => {
    const isOwner = (item) => {
        if (userRole === 'PATIENT' && userEmail) {
            return item.patient?.email === userEmail;
        }
        if (clinicId) {
            return item.clinicId === clinicId;
        }
        return false;
    };
    // 1. patient_document table
    if (!tableHint || tableHint === 'patient_document') {
        const document = await prisma.patient_document.findUnique({
            where: { id: recordId },
            include: { patient: { select: { email: true } } }
        });
        if (document) {
            if (!isOwner(document))
                throw new AppError('Access denied', 403);
            await prisma.patient_document.delete({ where: { id: recordId } });
            return;
        }
    }
    // 2. medical_report table
    if (!tableHint || tableHint === 'medical_report') {
        const report = await prisma.medical_report.findUnique({
            where: { id: recordId },
            include: { patient: { select: { email: true } } }
        });
        if (report) {
            if (!isOwner(report))
                throw new AppError('Access denied', 403);
            await prisma.medical_report.delete({ where: { id: recordId } });
            return;
        }
    }
    // 3. service_order table
    if (!tableHint || tableHint === 'service_order') {
        const order = await prisma.service_order.findUnique({
            where: { id: recordId },
            include: { patient: { select: { email: true } } }
        });
        if (order) {
            if (!isOwner(order))
                throw new AppError('Access denied', 403);
            await prisma.service_order.delete({ where: { id: recordId } });
            return;
        }
    }
    // 4. medicalrecord table
    if (!tableHint || tableHint === 'medicalrecord') {
        const medRecord = await prisma.medicalrecord.findUnique({
            where: { id: recordId },
            include: { patient: { select: { email: true } } }
        });
        if (medRecord) {
            if (!isOwner(medRecord))
                throw new AppError('Access denied', 403);
            await prisma.medicalrecord.delete({ where: { id: recordId } });
            return;
        }
    }
    throw new AppError('Record not found', 404);
};
export const getMyInvoices = async (userId, email, clinicId) => {
    const whereClause = { email: email };
    if (clinicId)
        whereClause.clinicId = clinicId;
    const patientRecords = await prisma.patient.findMany({
        where: whereClause,
        select: { id: true }
    });
    const patientIds = patientRecords.map(p => p.id);
    if (patientIds.length === 0)
        return [];
    const invoiceWhere = { patientId: { in: patientIds } };
    if (clinicId)
        invoiceWhere.clinicId = clinicId;
    const invoices = await prisma.invoice.findMany({
        where: invoiceWhere,
        include: {
            clinic: { select: { name: true } },
            items: true,
            doctor: {
                include: {
                    user: { select: { name: true } }
                }
            }
        },
        orderBy: {
            date: 'desc'
        }
    });
    return invoices.map((inv) => ({
        ...inv,
        doctorName: inv.doctor?.user?.name || null
    }));
};
export const getMyActivity = async (userId, email, clinicId) => {
    const whereClause = { email };
    if (clinicId)
        whereClause.clinicId = clinicId;
    const patients = await prisma.patient.findMany({
        where: whereClause,
        select: { id: true }
    });
    const patientIds = patients.map(p => p.id);
    if (patientIds.length === 0)
        return [];
    const activityWhere = { patientId: { in: patientIds } };
    if (clinicId)
        activityWhere.clinicId = clinicId;
    const [appointments, records, invoices, documents, reports] = await Promise.all([
        prisma.appointment.findMany({
            where: activityWhere,
            include: { clinic: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
            take: 5
        }),
        prisma.medicalrecord.findMany({
            where: activityWhere,
            include: { clinic: { select: { name: true } }, formtemplate: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
            take: 5
        }),
        prisma.invoice.findMany({
            where: activityWhere,
            include: { clinic: { select: { name: true } } },
            orderBy: { date: 'desc' },
            take: 5
        }),
        prisma.patient_document.findMany({
            where: activityWhere,
            include: { clinic: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
            take: 5
        }),
        prisma.medical_report.findMany({
            where: activityWhere,
            include: { clinic: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
            take: 5
        })
    ]);
    const activities = [
        ...appointments.map(a => ({
            id: a.id,
            type: 'APPOINTMENT',
            title: `Appointment ${a.status}`,
            description: `${a.service} scheduled for ${new Date(a.date).toLocaleDateString()}`,
            date: a.createdAt,
            clinic: a.clinic?.name
        })),
        ...records.map(r => ({
            id: r.id,
            type: 'RECORD',
            title: r.type === 'PRESCRIPTION' ? 'New Prescription' : (r.formtemplate?.name || 'Medical Record'),
            description: r.type === 'PRESCRIPTION' ? 'A new prescription has been issued' : 'Consultation notes updated',
            date: r.createdAt,
            clinic: r.clinic?.name
        })),
        ...invoices.map(i => ({
            id: i.id,
            type: 'INVOICE',
            title: `Invoice #${i.id}`,
            description: `Amount: ${i.totalAmount} | Status: ${i.status}`,
            date: i.date,
            clinic: i.clinic?.name
        })),
        ...documents.map(d => ({
            id: d.id,
            type: 'DOCUMENT',
            title: d.name,
            description: `Document type: ${d.type}`,
            date: d.createdAt,
            clinic: d.clinic?.name
        })),
        ...reports.map(rep => ({
            id: rep.id,
            type: 'REPORT',
            title: 'Official Medical Report',
            description: rep.diagnosisSummary ? rep.diagnosisSummary.substring(0, 100) : 'Medical report issued by doctor',
            date: rep.createdAt,
            clinic: rep.clinic?.name
        }))
    ];
    return activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);
};
export const bookAppointment = async (userId, email, data) => {
    // 1. Find or create the patient record for this specific clinic
    let patient = await prisma.patient.findFirst({
        where: {
            email: email,
            clinicId: data.clinicId
        }
    });
    if (!patient) {
        // Auto-create patient record if user is logged in but has no patient record in this clinic
        const user = await prisma.user.findUnique({ where: { id: userId } });
        patient = await prisma.patient.create({
            data: {
                clinicId: data.clinicId,
                name: user?.name || 'Unknown Patient',
                email: email,
                phone: user?.phone || 'N/A',
                status: 'Active'
            }
        });
    }
    // 2. Create appointment
    const appointment = await prisma.appointment.create({
        data: {
            clinicId: data.clinicId,
            patientId: patient.id,
            doctorId: data.doctorId,
            date: new Date(data.date),
            time: data.time,
            status: 'Pending', // Defaults to Pending for patient bookings
            source: data.source || 'Patient Portal',
            notes: data.notes,
            service: data.service || 'Consultation'
        }
    });
    const clinic = await prisma.clinic.findUnique({ where: { id: data.clinicId } });
    if (clinic && clinic.bookingConfig) {
        // Here we could handle auto-approval logic if defined in bookingConfig
    }
    return appointment;
};
export const publicBookAppointment = async (data) => {
    try {
        const { name, email, phone, clinicId, doctorId, date, time, notes, service, password } = data;
        if (!email)
            throw new AppError('Email is required', 400);
        if (!clinicId || isNaN(Number(clinicId)))
            throw new AppError('Valid Clinic ID is required', 400);
        if (!doctorId || isNaN(Number(doctorId)))
            throw new AppError('Valid Doctor ID is required', 400);
        if (!date)
            throw new AppError('Date is required', 400);
        // 1. Find or create User - and UPDATE if exists
        let user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            const finalPassword = password
                ? await bcrypt.hash(password, 12)
                : await bcrypt.hash('Patient123!', 12);
            user = await prisma.user.create({
                data: {
                    email,
                    name,
                    phone: phone || '',
                    password: finalPassword,
                    role: 'PATIENT'
                }
            });
        }
        else {
            // Update existing user with new name/phone from walk-in form
            user = await prisma.user.update({
                where: { email },
                data: { name, phone: phone || user.phone }
            });
        }
        // 2. Find or create Patient record for this clinic - and UPDATE if exists
        let patient = await prisma.patient.findFirst({
            where: { email, clinicId: Number(clinicId) }
        });
        if (!patient) {
            patient = await prisma.patient.create({
                data: {
                    clinicId: Number(clinicId),
                    name,
                    email,
                    phone: phone || '',
                    status: 'Active'
                }
            });
        }
        else {
            // Update existing patient record with latest info
            patient = await prisma.patient.update({
                where: { id: patient.id },
                data: { name, phone: phone || patient.phone }
            });
        }
        // Handle Date parsing carefully
        let appointmentDate = new Date(date);
        if (isNaN(appointmentDate.getTime())) {
            // Try parsing DD-MM-YYYY if regular parsing fails
            const parts = date.split('-');
            if (parts.length === 3) {
                // Assuming DD-MM-YYYY
                appointmentDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
            }
        }
        if (isNaN(appointmentDate.getTime())) {
            throw new AppError('Invalid date format provided', 400);
        }
        // 3. Create Appointment
        const appointment = await prisma.appointment.create({
            data: {
                clinicId: Number(clinicId),
                patientId: patient.id,
                doctorId: Number(doctorId),
                date: appointmentDate,
                time,
                status: 'Pending',
                source: data.source || 'Public Portal',
                notes: notes || '',
                service: service || 'Consultation'
            },
            include: {
                patient: true // Include patient data in response to confirm
            }
        });
        return appointment;
    }
    catch (error) {
        console.error('Error in publicBookAppointment:', error);
        throw error;
    }
};
export const getClinicDoctors = async (clinicId) => {
    const doctors = await prisma.clinicstaff.findMany({
        where: {
            clinicId,
            role: 'DOCTOR'
        },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true
                }
            }
        }
    });
    return doctors.map(d => ({
        id: d.id,
        name: d.user.name,
        specialty: d.specialty || 'General Practitioner'
    }));
};
export const getClinicBookingDetails = async (clinicId) => {
    const clinic = await prisma.clinic.findUnique({
        where: { id: clinicId },
        select: { bookingConfig: true, name: true }
    });
    let config = null;
    if (clinic?.bookingConfig) {
        try {
            config = JSON.parse(clinic.bookingConfig);
        }
        catch (e) {
            console.error('Failed to parse booking config', e);
        }
    }
    // Get all doctors for the clinic
    const allDoctors = await prisma.clinicstaff.findMany({
        where: {
            clinicId,
            role: 'DOCTOR'
        },
        include: {
            user: { select: { id: true, name: true } }
        }
    });
    // Valid doctors
    const availableDoctors = allDoctors.map(d => ({
        id: d.id,
        name: d.user.name,
        specialty: d.specialty || 'General Practitioner'
    }));
    // Return the combined details
    return {
        doctors: availableDoctors,
        timeSlots: config?.timeSlots || ['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'],
        offDays: config?.offDays || [],
        services: config?.services || ['Consultation'],
        headerTitle: config?.headerTitle || 'Appointment Booking',
        headerSubtitle: config?.headerSubtitle || 'Book a consultation with our experienced medical team.',
        clinicName: clinic?.name
    };
};
export const getMyClinics = async (email) => {
    const patients = await prisma.patient.findMany({
        where: { email },
        include: {
            clinic: {
                select: {
                    id: true,
                    name: true,
                    location: true,
                    documentTypes: true
                }
            }
        }
    });
    return patients.map(p => ({
        ...p.clinic,
        documentTypes: p.clinic.documentTypes ? JSON.parse(p.clinic.documentTypes) : []
    }));
};
export const getPublicClinics = async () => {
    return await prisma.clinic.findMany({
        select: {
            id: true,
            name: true,
            location: true,
            logo: true
        }
    });
};
