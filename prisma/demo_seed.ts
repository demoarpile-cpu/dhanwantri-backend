import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Adding Complete Demo Credentials...');

    const demoPassword = await bcrypt.hash('admin123', 12);

    // Find any existing clinic
    const clinic = await prisma.clinic.findFirst();
    if (!clinic) {
        console.error('❌ No clinic found in database. Please run the main seed first.');
        return;
    }
    const clinicId = clinic.id;
    console.log(`Using clinic: ${clinic.name} (ID: ${clinicId})`);

    const demoUsers = [
        { email: 'superadmin@evclinic.demo', name: 'Demo Super Admin', role: 'SUPER_ADMIN', dept: 'System' },
        { email: 'admin@evclinic.demo', name: 'Demo Admin', role: 'ADMIN', dept: 'Administration' },
        { email: 'doctor@evclinic.demo', name: 'Demo Doctor', role: 'DOCTOR', dept: 'Clinical' },
        { email: 'reception@evclinic.demo', name: 'Demo Receptionist', role: 'RECEPTIONIST', dept: 'Front Desk' },
        { email: 'pharmacy@evclinic.demo', name: 'Demo Pharmacist', role: 'PHARMACY', dept: 'Pharmacy' },
        { email: 'lab@evclinic.demo', name: 'Demo Lab Tech', role: 'LAB', dept: 'Laboratory' },
        { email: 'radiology@evclinic.demo', name: 'Demo Radiologist', role: 'RADIOLOGY', dept: 'Radiology' },
        { email: 'accountant@evclinic.demo', name: 'Demo Accountant', role: 'ACCOUNTANT', dept: 'Finance' },
        { email: 'doccontrol@evclinic.demo', name: 'Demo Doc Controller', role: 'DOCUMENT_CONTROLLER', dept: 'Administration' },
        { email: 'patient@evclinic.demo', name: 'Demo Patient', role: 'PATIENT', dept: 'General' },
    ];

    for (const u of demoUsers) {
        // Find if user already exists
        let user = await prisma.user.findUnique({
            where: { email: u.email }
        });

        if (!user) {
            user = await prisma.user.create({
                data: {
                    email: u.email,
                    password: demoPassword,
                    name: u.name,
                    role: u.role as any,
                    status: 'active'
                }
            });
            console.log(`✅ Created demo user: ${u.email}`);
        } else {
            console.log(`User already exists: ${u.email}`);
        }

        // Handle clinic-specific roles (except Super Admin which is global and Patient which uses patient table)
        if (u.role !== 'SUPER_ADMIN' && u.role !== 'PATIENT') {
            const existingStaff = await prisma.clinicstaff.findFirst({
                where: { userId: user.id, clinicId: clinicId }
            });

            if (!existingStaff) {
                await prisma.clinicstaff.create({
                    data: {
                        userId: user.id,
                        clinicId: clinicId,
                        role: u.role as any,
                        department: u.dept
                    }
                });
                console.log(`✅ Mapped ${u.role} to clinic ${clinicId}`);
            }
        }

        if (u.role === 'PATIENT') {
            const existingPatient = await prisma.patient.findFirst({
                where: { email: u.email, clinicId: clinicId }
            });

            if (!existingPatient) {
                await prisma.patient.create({
                    data: {
                        clinicId: clinicId,
                        name: u.name,
                        email: u.email,
                        phone: '0000000000',
                        mrn: `DEMO-${Math.floor(Math.random() * 10000)}`,
                        status: 'Active'
                    }
                });
                console.log(`✅ Created patient record for: ${u.email}`);
            }
        }
    }

    console.log('✅ All Demo Credentials Processed Successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
