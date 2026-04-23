import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function addGlobalTemplates() {
    console.log('Adding Global Templates...');
    const fields = JSON.stringify([
        {
            id: 'chiefComplaint',
            type: 'textarea',
            label: 'Chief Complaint',
            required: true,
            placeholder: 'Patient\'s primary reason for visit'
        },
        {
            id: 'symptoms',
            type: 'textarea',
            label: 'Symptoms',
            required: true,
            placeholder: 'List of symptoms reported'
        },
        {
            id: 'examination',
            type: 'textarea',
            label: 'Physical Examination Findings',
            required: true,
            placeholder: 'Observations from physical exam'
        }
    ]);

    await prisma.formtemplate.create({
        data: {
            clinicId: null, // GLOBAL
            name: 'Standard Clinical Assessment',
            specialty: 'General Medicine',
            status: 'published',
            version: 1,
            fields
        }
    });

    console.log('Global template added successfully.');
    process.exit(0);
}

addGlobalTemplates().catch(console.error);
