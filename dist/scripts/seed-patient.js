import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
const seedPatient = async () => {
    try {
        const email = 'patient@ev.com';
        const hashedPassword = await bcrypt.hash('patient123', 12);
        // 1. Create/Update User
        const user = await prisma.user.upsert({
            where: { email },
            update: {
                password: hashedPassword,
                role: 'PATIENT' // Ensure role is set
            },
            create: {
                email,
                password: hashedPassword,
                name: 'Demo Patient',
                role: 'PATIENT',
                phone: '+971500000000',
                status: 'active'
            }
        });
        console.log(`✅ User ensured: ${user.email} (ID: ${user.id})`);
        // 2. Create/Update Patient Record (Clinic 1)
        const patient = await prisma.patient.upsert({
            where: {
                // Since there's no unique email constraint on Patient table globally (it's clinic scoped), 
                // we'll try to find one or create.
                // But upsert needs a unique key. 
                // Let's just create if not exists or update based on a findFirst logic if we could, 
                // but for upsert we need unique.
                // The schema has @@unique([clinicId, mrn]).
                clinicId_mrn: { clinicId: 1, mrn: 'MRN-DEMO-001' }
            },
            update: {
                email,
                name: 'Demo Patient'
            },
            create: {
                clinicId: 1,
                name: 'Demo Patient',
                mrn: 'MRN-DEMO-001',
                email,
                phone: '+971500000000',
                age: 34,
                gender: 'Male',
                status: 'Active',
                createdYear: 2024
            }
        });
        console.log(`✅ Patient Record ensured: ${patient.name} (ID: ${patient.id})`);
        // 3. Create Sample Appointment (Future)
        await prisma.appointment.create({
            data: {
                clinicId: 1,
                patientId: patient.id,
                doctorId: 3, // Assuming doctor ID 3 exists or roughly valid
                date: new Date(new Date().setDate(new Date().getDate() + 5)), // 5 days later
                time: '10:00 AM',
                status: 'Approved',
                source: 'Patient Portal',
                billingAmount: 350
            }
        });
        // 4. Create Sample Invoice (Past)
        await prisma.invoice.create({
            data: {
                id: `INV-${Date.now().toString().slice(-6)}`,
                clinicId: 1, // Assuming clinic.id refers to the hardcoded clinicId 1
                patientId: patient.id,
                totalAmount: 150.00,
                status: 'Pending',
                date: new Date(new Date().setDate(new Date().getDate() - 10)) // 10 days ago
            }
        });
        console.log('✅ Sample Data Created');
    }
    catch (e) {
        console.error(e);
        process.exit(1);
    }
    finally {
        await prisma.$disconnect();
    }
};
seedPatient();
