import { PrismaClient, user_role, clinicstaff_role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function recreatePooja() {
    const saltRounds = 10;
    const commonPassword = await bcrypt.hash('admin123', saltRounds);

    // 1. Create Pooja Clinic
    const pooja = await prisma.clinic.upsert({
        where: { subdomain: 'pooja' },
        update: {},
        create: {
            name: 'Pooja Clinic',
            subdomain: 'pooja',
            location: 'Mumbai, India',
            contact: '9876543210',
            email: 'pooja@ev-clinic.com',
            status: 'active',
            modules: JSON.stringify({
                pharmacy: true,
                radiology: true,
                laboratory: true,
                billing: true,
                inventory: true,
                reports: true
            })
        }
    });
    console.log(`Recreated Pooja Clinic with ID: ${pooja.id}`);

    // 2. Ensure Dr. Deepak
    const drDeepak = await prisma.user.upsert({
        where: { email: 'deepak@ev-clinic.com' },
        update: {},
        create: {
            name: 'Dr. Deepak',
            email: 'deepak@ev-clinic.com',
            password: commonPassword,
            role: user_role.DOCTOR,
            status: 'active'
        }
    });

    await prisma.clinicstaff.upsert({
        where: { userId_clinicId_role: { userId: drDeepak.id, clinicId: pooja.id, role: clinicstaff_role.DOCTOR } },
        update: {},
        create: { userId: drDeepak.id, clinicId: pooja.id, role: clinicstaff_role.DOCTOR }
    });
    console.log('Dr. Deepak restored.');

    // 3. Ensure Pharma User
    const pharma = await prisma.user.upsert({
        where: { email: 'pharma@ev-clinic.com' },
        update: {},
        create: {
            name: 'Pharmacy Staff',
            email: 'pharma@ev-clinic.com',
            password: commonPassword,
            role: user_role.PHARMACY,
            status: 'active'
        }
    });
    await prisma.clinicstaff.upsert({
        where: { userId_clinicId_role: { userId: pharma.id, clinicId: pooja.id, role: clinicstaff_role.PHARMACY } },
        update: {},
        create: { userId: pharma.id, clinicId: pooja.id, role: clinicstaff_role.PHARMACY }
    });

    // 4. Ensure Lab User
    const lab = await prisma.user.upsert({
        where: { email: 'lab@ev-clinic.com' },
        update: {},
        create: {
            name: 'Lab Technician',
            email: 'lab@ev-clinic.com',
            password: commonPassword,
            role: user_role.LAB,
            status: 'active'
        }
    });
    await prisma.clinicstaff.upsert({
        where: { userId_clinicId_role: { userId: lab.id, clinicId: pooja.id, role: clinicstaff_role.LAB } },
        update: {},
        create: { userId: lab.id, clinicId: pooja.id, role: clinicstaff_role.LAB }
    });

    // 5. Ensure Patients
    const rahul = await prisma.patient.create({
        data: {
            clinicId: pooja.id,
            name: 'Rahul',
            phone: '1111111111',
            status: 'Active'
        }
    });
    const yash = await prisma.patient.create({
        data: {
            clinicId: pooja.id,
            name: 'Yash',
            phone: '2222222222',
            status: 'Active'
        }
    });
    console.log('Patients Rahul and Yash restored.');

    process.exit(0);
}

recreatePooja();
