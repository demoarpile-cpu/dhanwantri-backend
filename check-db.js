import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function check() {
    const users = await prisma.user.findMany({ where: { email: { contains: 'doctor' } } });
    console.log('Doctor Users:', JSON.stringify(users, null, 2));

    const staff = await prisma.clinicstaff.findMany({ include: { user: true } });
    console.log('Clinic Staff:', JSON.stringify(staff, null, 2));

    const patientsCount = await prisma.patient.count();
    console.log('Total Patients:', patientsCount);
}
check().finally(() => prisma.$disconnect());
