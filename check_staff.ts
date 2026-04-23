import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
    const staff = await prisma.clinicstaff.findMany({
        include: { user: true, clinic: true }
    });
    console.log('Staff records:', JSON.stringify(staff, null, 2));
    process.exit(0);
}

check();
