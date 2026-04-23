import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkPooja() {
    const clinic = await prisma.clinic.findFirst({
        where: { name: { contains: 'pooja' } }
    });
    console.log('Clinic Name:', clinic?.name);
    console.log('Modules Enabled:', clinic?.modules);
    process.exit(0);
}

checkPooja();
