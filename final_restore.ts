import { PrismaClient, user_role, clinicstaff_role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function finalRestore() {
    const saltRounds = 10;
    const password = await bcrypt.hash('admin123', saltRounds);

    console.log('--- STARTING FINAL RESTORATION ---');

    // 1. Create/Update Pooja Clinic
    const pooja = await prisma.clinic.upsert({
        where: { subdomain: 'pooja' },
        update: {
            status: 'active',
            modules: JSON.stringify({
                pharmacy: true,
                radiology: true,
                laboratory: true,
                billing: true,
                inventory: true
            })
        },
        create: {
            name: 'Pooja Clinic',
            subdomain: 'pooja',
            location: 'Mumbai',
            contact: '9876543210',
            email: 'pooja@ev-clinic.com',
            status: 'active',
            modules: JSON.stringify({
                pharmacy: true,
                radiology: true,
                laboratory: true,
                billing: true,
                inventory: true
            })
        }
    });

    // 2. Setup Staff
    const staffData = [
        { name: 'Dr. Deepak', email: 'deepak@ev-clinic.com', role: user_role.DOCTOR, cRole: clinicstaff_role.DOCTOR },
        { name: 'Pharma User', email: 'pharma@ev-clinic.com', role: user_role.PHARMACY, cRole: clinicstaff_role.PHARMACY },
        { name: 'Lab User', email: 'lab@ev-clinic.com', role: user_role.LAB, cRole: clinicstaff_role.LAB },
        { name: 'Radio User', email: 'radio@ev-clinic.com', role: user_role.RADIOLOGY, cRole: clinicstaff_role.RADIOLOGY }
    ];

    for (const s of staffData) {
        const u = await prisma.user.upsert({
            where: { email: s.email },
            update: { role: s.role },
            create: {
                name: s.name,
                email: s.email,
                password: password,
                role: s.role,
                status: 'active'
            }
        });

        await prisma.clinicstaff.upsert({
            where: { userId_clinicId_role: { userId: u.id, clinicId: pooja.id, role: s.cRole } },
            update: {},
            create: { userId: u.id, clinicId: pooja.id, role: s.cRole }
        });
    }

    // 3. Setup Patients (Rahul & Yash)
    const rahul = await prisma.patient.upsert({
        where: { clinicId_mrn: { clinicId: pooja.id, mrn: 'RAHUL001' } },
        update: {},
        create: {
            clinicId: pooja.id,
            name: 'Rahul',
            phone: '1111111111',
            mrn: 'RAHUL001',
            status: 'Active'
        }
    });

    const yash = await prisma.patient.upsert({
        where: { clinicId_mrn: { clinicId: pooja.id, mrn: 'YASH001' } },
        update: {},
        create: {
            clinicId: pooja.id,
            name: 'Yash',
            phone: '2222222222',
            mrn: 'YASH001',
            status: 'Active'
        }
    });

    console.log(`Successfully restored Pooja Clinic (ID: ${pooja.id}) with Rahul and Yash.`);
    process.exit(0);
}

finalRestore();
