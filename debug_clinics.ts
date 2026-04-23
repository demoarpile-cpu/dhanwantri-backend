import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const clinics = await prisma.clinic.findMany({
        where: { name: 'fast' }
    });
    console.log(JSON.stringify(clinics, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
