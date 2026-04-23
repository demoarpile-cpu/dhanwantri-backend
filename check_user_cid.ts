import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function check() {
    const u = await prisma.user.findFirst({ where: { email: 'pharma@ev-clinic.com' } });
    console.log('Pharma Primary ClinicId:', u?.clinicId);
    process.exit(0);
}
check();
