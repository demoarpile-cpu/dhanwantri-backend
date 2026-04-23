import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const clinicId = 61;
    const staff = await prisma.clinicstaff.findMany({
        where: { clinicId },
        include: { user: true }
    });

    console.log(`--- STAFF FOR CLINIC ${clinicId} ---`);
    staff.forEach(s => {
        console.log(`Email: ${s.user.email} | Role: ${s.role}`);
    });

    const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } });
    console.log(`Modules: ${clinic?.modules}`);
}

main().finally(() => prisma.$disconnect());
