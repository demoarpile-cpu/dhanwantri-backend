import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTemplates(clinicId: number) {
    console.log(`Checking templates for Clinic ID: ${clinicId}`);

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
    templates.forEach(t => {
        console.log(`- ${t.name} (ClinicID: ${t.clinicId})`);
    });
}

// Test with a random ID to simulate a new clinic with no specific templates
checkTemplates(99999)
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
