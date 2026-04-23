
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const fields = JSON.stringify([
        { id: "chiefComplaint", type: "textarea", label: "Chief Complaint", required: true, placeholder: "Patient's primary reason for visit" },
        { id: "symptoms", type: "textarea", label: "Symptoms", required: true, placeholder: "List of symptoms reported" },
        { id: "vitals", type: "text", label: "Vitals (BP, HR, Temp)", required: false, placeholder: "e.g. 120/80, 72bpm, 36.5C" },
        { id: "examination", type: "textarea", label: "Physical Examination Findings", required: true, placeholder: "Observations from physical exam" }
    ]);

    // Create a global template if it doesn't exist
    const existingGlobal = await prisma.formtemplate.findFirst({
        where: { clinicId: null, name: "General Clinical Assessment" }
    });

    if (!existingGlobal) {
        await prisma.formtemplate.create({
            data: {
                name: "General Clinical Assessment",
                specialty: "General Medicine",
                status: "published",
                fields: fields
            }
        });
        console.log('Global template created');
    } else {
        console.log('Global template already exists');
    }

    // Also, let's update existing templates to be global if they are "General Clinical Assessment"
    const updated = await prisma.formtemplate.updateMany({
        where: { name: "General Clinical Assessment" },
        data: { clinicId: null }
    });
    console.log(`Updated ${updated.count} templates to be global.`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
