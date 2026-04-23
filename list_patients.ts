import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function findPatients() {
    const pts = await prisma.patient.findMany({
        include: { clinic: true }
    });
    console.log('ALL PATIENTS IN DB:');
    pts.forEach(p => console.log(`ID: ${p.id} | Name: ${p.name} | Clinic: ${p.clinic.name} (${p.clinicId})`));
    process.exit(0);
}
findPatients();
