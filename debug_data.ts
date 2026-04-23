import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkData() {
    const clinics = await prisma.clinic.findMany({ select: { id: true, name: true } });
    console.log('--- Clinics ---');
    clinics.forEach(c => console.log(`ID: ${c.id}, Name: ${c.name}`));

    const orders = await prisma.service_order.findMany({
        include: { patient: { select: { name: true } }, clinic: { select: { name: true } } }
    });
    console.log('\n--- Service Orders ---');
    orders.forEach(o => {
        console.log(`ID: ${o.id}, Clinic: ${o.clinicId} (${o.clinic?.name}), Patient: ${o.patient?.name}, Type: ${o.type}, Test: ${o.testName}, Status: ${o.status}`);
    });
    process.exit(0);
}

checkData();
