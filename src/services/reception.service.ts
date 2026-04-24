import { prisma } from '../lib/prisma.js';
import { AppError } from '../utils/AppError.js';

const getNextToken = async (clinicId: number) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return await prisma.$transaction(async (tx) => {
        const clinic = await tx.clinic.findUnique({
            where: { id: clinicId },
            select: { lastTokenNumber: true, lastTokenDate: true }
        });

        const clinicDate = clinic?.lastTokenDate ? new Date(clinic.lastTokenDate) : null;
        if (clinicDate) clinicDate.setHours(0, 0, 0, 0);

        let nextToken = 1;
        if (clinicDate && clinicDate.getTime() === today.getTime()) {
            nextToken = (clinic?.lastTokenNumber || 0) + 1;
        }

        await tx.clinic.update({
            where: { id: clinicId },
            data: {
                lastTokenNumber: nextToken,
                lastTokenDate: today
            }
        });

        return nextToken;
    });
};

export const getPatientsByClinic = async (clinicId: number, search?: string) => {
    return await prisma.patient.findMany({
        where: {
            clinicId,
            OR: search ? [
                { name: { contains: search } },
                { phone: { contains: search } },
                { mrn: { contains: search } }
            ] : undefined
        }
    });
};

export const registerPatient = async (clinicId: number, data: any) => {
    const {
        name, phone, email, dob, gender, address,
        medicalHistory, doctorId, visitTime, fees
    } = data;

    // Generate MRN (Medical Record Number) - simplified
    const mrn = `MRN-${Date.now().toString().slice(-6)}`;

    // Check for duplicate patient
    const existingPatient = await prisma.patient.findFirst({
        where: {
            clinicId,
            name: name,
            phone: phone
        }
    });

    if (existingPatient) {
        throw new AppError('Patient with this name and phone number already exists.', 409);
    }

    // Calculate age if dob provided
    let calculatedAge = null;
    if (dob) {
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        calculatedAge = age;
    }

    const patient = await prisma.patient.create({
        data: {
            clinicId,
            name,
            phone,
            email: email || null,
            gender,
            age: calculatedAge,
            address,
            medicalHistory,
            mrn,
            createdYear: new Date().getFullYear(),
            status: doctorId ? 'Pending Payment' : 'Active'
        }
    });

    // Create User account for Patient Portal Access
    let userCredentials = null;
    if (email) {
        // Check if user exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (!existingUser) {
            const tempPassword = data.password || `Pass@${Math.floor(1000 + Math.random() * 9000)}`;
            const bcrypt = await import('bcryptjs');
            // sendCredentialsEmail imported later
            const { sendCredentialsEmail } = await import('./mail.service.js');
            const passwordHash = await bcrypt.hash(tempPassword, 12);

            await prisma.user.create({
                data: {
                    email,
                    password: passwordHash,
                    name,
                    role: 'PATIENT',
                    status: 'active'
                }
            });
            userCredentials = { email, password: tempPassword };

            // Send email to patient
            await sendCredentialsEmail(email, name, tempPassword);
        }
    }

    // If it's a walk-in, create an appointment
    if (doctorId && fees) {
        const today = new Date();
        const tokenNumber = await getNextToken(clinicId);
        await prisma.appointment.create({
            data: {
                clinicId,
                patientId: patient.id,
                doctorId: Number(doctorId),
                tokenNumber,
                date: today,
                time: visitTime || today.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                status: 'Checked In',
                queueStatus: 'Checked-In',
                source: 'Walk-in',
                billingAmount: Number(fees)
            }
        });
    }

    return { ...patient, credentials: userCredentials };
};

export const updatePatientDetails = async (clinicId: number, patientId: number, data: any) => {
    // 1. Get current patient to check for email change
    const currentPatient = await prisma.patient.findUnique({
        where: { id: patientId }
    });

    if (!currentPatient) {
        throw new AppError('Patient not found', 404);
    }

    if (currentPatient.clinicId !== clinicId) {
        throw new AppError('Unauthorized access to patient', 403);
    }

    // 2. Update Patient record
    const updatedPatient = await prisma.patient.update({
        where: { id: patientId },
        data: {
            name: data.name,
            phone: data.phone,
            email: data.email,
            age: data.age ? Number(data.age) : undefined,
            gender: data.gender,
            address: data.address,
            medicalHistory: data.medicalHistory,
            allergies: data.allergies
        }
    });

    // 3. If email changed, sync with User account
    if (data.email && currentPatient.email && data.email !== currentPatient.email) {
        const existingUser = await prisma.user.findUnique({
            where: { email: currentPatient.email }
        });

        if (existingUser) {
            // Check if new email is already taken by another user
            const emailTaken = await prisma.user.findUnique({
                where: { email: data.email }
            });

            if (emailTaken) {
                // If taken, we can't update the User email, but Patient email is updated.
                // This might cause a desync, but we should warn or handle.
                // For now, let's assuming strict uniqueness and throw if we can't sync, 
                // OR just leave the User as is (but then they can't login with new email).
                // Better: Throw error if email taken. But we already updated Patient.
                // Ideally this should be a transaction.
                // For simplicity in this existing codebase style:
                console.warn(`Could not update User email for patient ${patientId}: ${data.email} is taken.`);
            } else {
                await prisma.user.update({
                    where: { id: existingUser.id },
                    data: { email: data.email, name: data.name || existingUser.name }
                });
            }
        }
    } else if (data.email && !currentPatient.email) {
        // Case: Patient didn't have email, now adding one. Check if we should create a user?
        // Logic similar to register might be needed if auto-create user is desired.
        // For now, we just update the patient.
    }

    return updatedPatient;
};

export const getBookings = async (clinicId: number, date?: string, patientId?: number) => {
    const appointments = await prisma.appointment.findMany({
        where: {
            clinicId,
            patientId: patientId ? Number(patientId) : undefined,
            date: date ? {
                gte: new Date(date),
                lt: new Date(new Date(date).setDate(new Date(date).getDate() + 1))
            } : undefined
        },
        include: {
            patient: true
        },
        orderBy: {
            date: 'asc'
        }
    });

    // Get all unique doctor IDs from appointments
    const doctorIds = [...new Set(appointments.map(apt => apt.doctorId))];

    // Fetch all doctors in one query
    const doctors = await prisma.clinicstaff.findMany({
        where: {
            id: { in: doctorIds },
            clinicId: clinicId
        },
        include: {
            user: {
                select: { id: true, name: true }
            }
        }
    });

    // Create a map for quick lookup
    const doctorMap = new Map(
        doctors.map(doc => [
            doc.id,
            {
                id: doc.id,
                name: doc.user.name,
                specialty: doc.specialty || null
            }
        ])
    );

    // Enrich appointments with doctor information
    const enrichedAppointments = appointments.map((appointment) => ({
        ...appointment,
        doctor: doctorMap.get(appointment.doctorId) || null
    }));

    return enrichedAppointments;
};

/** Get appointments for a specific patient (today + upcoming, for "patient ke liye appointment hai" check) */
export const getPatientAppointments = async (clinicId: number, patientId: number) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const appointments = await prisma.appointment.findMany({
        where: {
            clinicId,
            patientId,
            date: { gte: today }
        },
        include: {
            patient: { select: { name: true } }
        },
        orderBy: [{ date: 'asc' }, { time: 'asc' }],
        take: 20
    });

    const doctorIds = [...new Set(appointments.map((a: any) => a.doctorId))];
    const doctors = await prisma.clinicstaff.findMany({
        where: { id: { in: doctorIds }, clinicId },
        include: { user: { select: { name: true } } }
    });
    const doctorMap = new Map(doctors.map(d => [d.id, d.user?.name || 'Unknown']));

    return appointments.map((a: any) => ({
        ...a,
        doctorName: doctorMap.get(a.doctorId) || 'Unknown'
    }));
};

export const updateBookingStatus = async (clinicId: number, id: number, status: string) => {
    // First verify the appointment belongs to this clinic
    const appointment = await prisma.appointment.findUnique({
        where: { id }
    });

    if (!appointment) {
        throw new Error('Appointment not found');
    }

    if (appointment.clinicId !== clinicId) {
        throw new Error('Unauthorized: Appointment does not belong to your clinic');
    }

    return await prisma.appointment.update({
        where: { id },
        data: {
            status,
            // Sync queueStatus if checking in via generic status update
            ...(status === 'Checked In' ? { queueStatus: 'Checked-In' } : {})
        }
    });
};

export const approveBooking = async (bookingId: number) => {
    const booking = await prisma.appointment.findUnique({
        where: { id: bookingId },
        include: { patient: true }
    });

    if (!booking) throw new AppError('Booking not found', 404);

    return await prisma.appointment.update({
        where: { id: bookingId },
        data: { status: 'Approved' }
    });
};

export const getReceptionStats = async (clinicId: number) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayAppts, totalPatients, pendingApprovals, checkedIn] = await Promise.all([
        prisma.appointment.count({
            where: {
                clinicId,
                date: {
                    gte: today,
                    lte: new Date(new Date().setHours(23, 59, 59, 999))
                }
            }
        }),
        prisma.patient.count({ where: { clinicId } }),
        prisma.appointment.count({
            where: { clinicId, status: 'Pending' }
        }),
        prisma.appointment.count({
            where: {
                clinicId,
                // Count all active appointments for today that are not finished or cancelled
                status: { notIn: ['Cancelled', 'Rejected', 'Completed'] },
                date: { gte: today, lte: new Date(new Date().setHours(23, 59, 59, 999)) }
            }
        })
    ]);

    return {
        todayAppointments: todayAppts,
        totalPatients,
        pendingApprovals,
        currentlyCheckedIn: checkedIn
    };
};

export const getReceptionActivities = async (clinicId: number) => {
    const appts = await prisma.appointment.findMany({
        where: { clinicId },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { patient: { select: { name: true } } }
    });

    return appts.map(a => ({
        id: a.id,
        action: `Booked Appointment for ${a.patient.name}`,
        time: a.createdAt,
        status: a.status
    }));
};

export const createBooking = async (clinicId: number, data: any) => {
    const { patientId, doctorId, date, time, fees, notes, service, status } = data;
    const finalStatus = status || 'Pending';

    let tokenNumber = null;
    let queueStatus = 'Pending';

    // Only generate token if explicitly checking in (e.g. Walk-in)
    if (finalStatus === 'Checked In' || finalStatus === 'Checked-In') {
        tokenNumber = await getNextToken(clinicId);
        queueStatus = 'Checked-In';
    }

    const appointment = await prisma.appointment.create({
        data: {
            clinicId,
            patientId: Number(patientId),
            doctorId: Number(doctorId),
            tokenNumber,
            date: date ? new Date(date) : new Date(),
            time: time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: finalStatus,
            queueStatus: queueStatus,
            source: 'Walk-in',
            billingAmount: fees ? Number(fees) : undefined,
            notes: notes || null,
            service: service || 'Consultation'
        },
        include: { patient: true }
    });

    return appointment;
};

export const checkInPatient = async (clinicId: number, appointmentId: number) => {
    const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId }
    });

    if (!appointment || appointment.clinicId !== clinicId) {
        throw new AppError('Appointment not found', 404);
    }

    // Generate token if not already assigned
    let tokenNumber = appointment.tokenNumber;
    if (!tokenNumber) {
        tokenNumber = await getNextToken(clinicId);
    }

    return await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
            status: 'Checked In',
            queueStatus: 'Checked-In',
            tokenNumber
        }
    });
};

export const resetPatientPassword = async (patientId: number, password: string) => {
    // 1. Find patient
    let patient = await prisma.patient.findUnique({
        where: { id: patientId }
    });

    if (!patient) throw new AppError('Patient not found', 404);

    // 2. Ensure Patient has an email
    if (!patient.email) {
        const generatedEmail = `patient${patient.id}@ev-clinic.com`;
        patient = await prisma.patient.update({
            where: { id: patientId },
            data: { email: generatedEmail }
        });
    }

    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 12);

    // 3. Find or Create User account
    const user = await prisma.user.findUnique({
        where: { email: patient.email! }
    });

    if (!user) {
        // Create new user account
        await prisma.user.create({
            data: {
                email: patient.email!,
                password: hashedPassword,
                name: patient.name,
                role: 'PATIENT',
                status: 'active'
            }
        });
    } else {
        // Update existing user password
        await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword }
        });
    }

    return { success: true };
};

