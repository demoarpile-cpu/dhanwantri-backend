import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkPoojaOrders() {
    const clinic = await prisma.clinic.findFirst({
        where: { name: { contains: 'pooja' } }
    });

    if (!clinic) {
        console.log('Pooja Clinic not found');
        process.exit(1);
    }

    console.log(`Checking orders for Clinic ID: ${clinic.id} (${clinic.name})`);

    const orders = await prisma.service_order.findMany({
        where: { clinicId: clinic.id },
        include: { patient: { select: { name: true } } }
    });

    console.log(`Total orders found: ${orders.length}`);
    orders.forEach(o => {
        console.log(`ID: ${o.id}, Type: ${o.type}, Test: ${o.testName}, Status: ${o.status}`);
    });

    // Also check medical records to see if the assessment actually exists
    const records = await prisma.medicalrecord.findMany({
        where: { clinicId: clinic.id },
        include: { patient: { select: { name: true } } }
    });
    console.log(`Total assessments found: ${records.length}`);
    records.forEach(r => {
        console.log(`Record ID: ${r.id}, Patient: ${r.patient?.name}, Type: ${r.type}`);
    });

    process.exit(0);
}

checkPoojaOrders();
