import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const clinics = await prisma.clinic.findMany({
        take: 5,
        orderBy: { createdDate: 'desc' },
        select: {
            id: true,
            name: true,
            logo: true,
            createdDate: true
        }
    });
    console.log(JSON.stringify(clinics, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
