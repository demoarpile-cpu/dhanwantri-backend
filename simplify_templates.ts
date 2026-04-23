
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const fields = JSON.stringify([
        { id: "chiefComplaint", type: "textarea", label: "Chief Complaint", required: true, placeholder: "Patient's primary reason for visit" },
        { id: "symptoms", type: "textarea", label: "Symptoms", required: true, placeholder: "List of symptoms reported" },
        { id: "vitals", type: "text", label: "Vitals (BP, HR, Temp)", required: false, placeholder: "e.g. 120/80, 72bpm, 36.5C" },
        { id: "examination", type: "textarea", label: "Physical Examination Findings", required: true, placeholder: "Observations from physical exam" }
    ]);

    // 1. Delete all existing templates to start fresh as requested (only one should exist)
    // We use deleteMany without where to clear all.
    await prisma.formtemplate.deleteMany({});
    console.log('Deleted all old templates.');

    // 2. Create exactly ONE global template
    await prisma.formtemplate.create({
        data: {
            clinicId: null, // Global
            name: "General Clinical Assessment",
            specialty: "General Medicine",
            status: "published",
            fields: fields
        }
    });
    console.log('Created single global template.');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
