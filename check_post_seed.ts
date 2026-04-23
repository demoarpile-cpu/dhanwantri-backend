import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
    const clinics = await prisma.clinic.findMany();
    console.log('CLINICS:');
    clinics.forEach(c => console.log(`ID: ${c.id} | Name: ${c.name}`));

    const orders = await prisma.service_order.findMany({
        include: { patient: true, clinic: true }
    });
    console.log('\nORDERS:');
    orders.forEach(o => console.log(`ID: ${o.id} | Clinic: ${o.clinic.name} (${o.clinicId}) | Patient: ${o.patient.name} | Type: ${o.type} | Status: ${o.status}`));

    process.exit(0);
}
check();
