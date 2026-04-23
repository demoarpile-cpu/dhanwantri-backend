import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
    console.log('--- LATEST CLINICS (DESC) ---');
    const clinics = await prisma.clinic.findMany({ orderBy: { id: 'desc' } });
    clinics.forEach(c => console.log(`ID: ${c.id} | Name: ${c.name} | Subdomain: ${c.subdomain}`));

    console.log('\n--- LATEST PATIENTS ---');
    const patients = await prisma.patient.findMany({
        include: { clinic: true },
        orderBy: { id: 'desc' },
        take: 10
    });
    patients.forEach(p => console.log(`ID: ${p.id} | Name: ${p.name} | Clinic: ${p.clinic.name} (${p.clinicId})`));

    process.exit(0);
}
check();
