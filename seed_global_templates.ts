import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const templates = [
    {
        name: 'General Clinical Assessment',
        specialty: 'General Practice',
        fields: [
            { id: 'chief_complaint', type: 'textarea', label: 'Chief Complaint', required: true },
            { id: 'hpi', type: 'textarea', label: 'History of Present Illness', required: true },
            {
                id: 'vitals', type: 'group', label: 'Vitals', fields: [
                    { id: 'bp', type: 'text', label: 'Blood Pressure' },
                    { id: 'hr', type: 'number', label: 'Heart Rate' },
                    { id: 'temp', type: 'number', label: 'Temperature' }
                ]
            },
            { id: 'tax', type: 'textarea', label: 'Treatment Plan', required: true }
        ]
    },
    {
        name: 'Dental Checkup',
        specialty: 'Dentistry',
        fields: [
            { id: 'complaint', type: 'textarea', label: 'Dental Complaint', required: true },
            { id: 'exam', type: 'textarea', label: 'Intraoral Examination', required: true },
            { id: 'plan', type: 'textarea', label: 'Procedure / Plan', required: true }
        ]
    },
    {
        name: 'Eye Examination',
        specialty: 'Ophthalmology',
        fields: [
            { id: 'vision_r', type: 'text', label: 'Vision (R)', required: true },
            { id: 'vision_l', type: 'text', label: 'Vision (L)', required: true },
            { id: 'exam', type: 'textarea', label: 'Fundoscopy Findings', required: true }
        ]
    }
];

async function main() {
    console.log('Seeding Global Templates (clinicId = null)...');

    for (const t of templates) {
        // Check if exists
        const exists = await prisma.formtemplate.findFirst({
            where: { name: t.name, clinicId: null }
        });

        if (!exists) {
            await prisma.formtemplate.create({
                data: {
                    clinicId: null,
                    name: t.name,
                    specialty: t.specialty,
                    status: 'published',
                    version: 1,
                    fields: JSON.stringify(t.fields)
                }
            });
            console.log(`Created global template: ${t.name}`);
        } else {
            console.log(`Template already exists: ${t.name}`);
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
