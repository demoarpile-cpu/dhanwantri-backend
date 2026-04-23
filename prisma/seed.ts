import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting Data Synchronization...');

    // 1. Clean Database
    console.log('🧹 Cleaning existing data...');
    await prisma.patient_document.deleteMany();
    await prisma.staff_document.deleteMany();
    await prisma.service_order.deleteMany();
    await prisma.inventory.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.medicalrecord.deleteMany();
    await prisma.formresponse.deleteMany();
    await prisma.appointment.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.clinicstaff.deleteMany();
    await prisma.department.deleteMany();
    await prisma.formtemplate.deleteMany();
    await prisma.auditlog.deleteMany();
    await prisma.patient.deleteMany();
    await prisma.subscription_invoice.deleteMany();
    await prisma.clinic.deleteMany();
    await prisma.user.deleteMany();
    console.log('✅ Database cleaned.');

    const commonPassword = await bcrypt.hash('123456', 12);
    const adminPassword = await bcrypt.hash('admin123', 12);

    // 2. Create Clinics
    console.log('🏥 Creating Clinics...');
    await prisma.clinic.create({
        data: {
            id: 10,
            name: 'Husri Clinic',
            subdomain: 'husri',
            location: 'Medical District, Dubai',
            contact: '+971 4 000 0000',
            email: 'info@husri.online',
            status: 'active',
            modules: JSON.stringify({ "pharmacy": true, "radiology": true, "laboratory": true, "billing": true, "reports": true }),
            subscriptionPlan: 'Yearly',
            subscriptionStart: new Date('2026-02-12T08:49:12.699Z'),
            subscriptionEnd: new Date('2027-02-12T08:49:12.699Z'),
            isActive: true
        }
    });

    await prisma.clinic.create({
        data: {
            id: 13,
            name: 'proclinic',
            subdomain: 'proclinic',
            location: 'indore',
            contact: '07805059522',
            email: 'proclinic@gmail.com',
            status: 'active',
            modules: JSON.stringify({ "pharmacy": true, "radiology": true, "laboratory": true, "billing": true }),
            subscriptionPlan: 'Trial',
            subscriptionStart: new Date('2026-02-12T12:32:10.772Z'),
            subscriptionEnd: new Date('2026-02-19T12:32:10.772Z'),
            isActive: true
        }
    });

    // 3. Create Users
    console.log('👤 Creating Users...');

    // Original Users
    const usersData = [
        { id: 40, email: 'superadmin@ev.com', name: 'Super Admin', role: 'SUPER_ADMIN', pass: 'admin123' },
        { id: 41, email: 'admin@ev-clinic.com', name: 'Clinic Administrator', role: 'ADMIN', pass: 'admin123' },
        { id: 53, email: 'proclinic@gmail.com', name: 'proclinic', role: 'ADMIN', pass: '123456' },

        // New Users from your list
        { id: 60, email: 'avinash@gmail.com', name: 'Doctor', role: 'DOCTOR', pass: '123456' },
        { id: 61, email: 'sonu@gmail.com', name: 'Reception / Admission', role: 'RECEPTIONIST', pass: '123456' },
        { id: 62, email: 'rohan@gmail.com', name: 'Pharmacist', role: 'PHARMACY', pass: '123456' },
        { id: 63, email: 'harshu@gmail.com', name: 'Lab Technician', role: 'LAB', pass: '123456' },
        { id: 64, email: 'shivam@gmail.com', name: 'Radiologist', role: 'RADIOLOGY', pass: '123456' },
        { id: 65, email: 'sakshi@gmail.com', name: 'Accountant', role: 'ACCOUNTANT', pass: '123456' },
        { id: 66, email: 'kunal@gmail.com', name: 'Document Controller', role: 'DOCUMENT_CONTROLLER', pass: '123456' },
        { id: 67, email: 'cult@gmail.com', name: 'Patient User', role: 'PATIENT', pass: '123456' },
        { id: 68, email: 'anmol@gmail.com', name: 'Dr. Anmol', role: 'DOCTOR', pass: '123456' }
    ];

    for (const u of usersData) {
        await prisma.user.create({
            data: {
                id: u.id,
                email: u.email,
                password: u.pass === '123456' ? commonPassword : adminPassword,
                name: u.name,
                role: u.role as any,
                status: 'active'
            }
        });
    }

    // 4. Create Clinic Staff (Mapping to proclinic ID: 13)
    console.log('👥 Mapping Staff to proclinic...');
    const staffData = [
        { userId: 53, clinicId: 13, role: 'ADMIN', department: 'Administration' },
        { userId: 60, clinicId: 13, role: 'DOCTOR', department: 'Clinical' },
        { userId: 61, clinicId: 13, role: 'RECEPTIONIST', department: 'Front Desk' },
        { userId: 62, clinicId: 13, role: 'PHARMACY', department: 'Pharmacy' },
        { userId: 63, clinicId: 13, role: 'LAB', department: 'Laboratory' },
        { userId: 64, clinicId: 13, role: 'RADIOLOGY', department: 'Radiology' },
        { userId: 65, clinicId: 13, role: 'ACCOUNTANT', department: 'Finance' },
        { userId: 66, clinicId: 13, role: 'DOCUMENT_CONTROLLER', department: 'Administration' },
        { userId: 68, clinicId: 13, role: 'DOCTOR', department: 'Clinical' }
    ];

    for (const s of staffData) {
        await prisma.clinicstaff.create({
            data: {
                userId: s.userId,
                clinicId: s.clinicId,
                role: s.role as any,
                department: s.department
            }
        });
    }

    // 5. Create Departments for proclinic
    console.log('🏢 Creating Departments for proclinic...');
    const depts = [
        { name: 'Administration', type: 'CLINICAL' },
        { name: 'Clinical', type: 'CLINICAL' },
        { name: 'Laboratory', type: 'SERVICE' },
        { name: 'Pharmacy', type: 'SERVICE' },
        { name: 'Radiology', type: 'SERVICE' }
    ];

    for (const d of depts) {
        await prisma.department.create({
            data: {
                clinicId: 13,
                name: d.name,
                type: d.type
            }
        });
    }

    console.log('✅ Seeding Complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
