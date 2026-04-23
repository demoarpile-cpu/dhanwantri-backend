import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const clinicId = 61; // The clinic for amul@gmail.com
    console.log(`Fetching for clinic ${clinicId}...`);

    const templates = await prisma.formtemplate.findMany({
        where: {
            OR: [
                { clinicId: Number(clinicId) },
                { clinicId: null }
            ],
            status: 'published'
        },
        orderBy: { name: 'asc' }
    });

    console.log(`Found ${templates.length} templates.`);
    console.log(JSON.stringify(templates, null, 2));
}

main().finally(() => prisma.$disconnect());
