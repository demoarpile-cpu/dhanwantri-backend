import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
    const user = await prisma.user.findUnique({
        where: { email: 'pharma@ev-clinic.com' },
        include: { clinicstaff: { include: { clinic: true } } }
    });
    console.log(`PHARMA_USER_CLINICS:`);
    user?.clinicstaff.forEach(cs => console.log(`CLINIC:${cs.clinicId}|NAME:${cs.clinic.name}|ROLE:${cs.role}`));
    process.exit(0);
}
check();
