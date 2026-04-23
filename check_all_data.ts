import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkEveryOrder() {
    const orders = await prisma.service_order.findMany({
        include: { clinic: true, patient: true },
        orderBy: { createdAt: 'desc' }
    });

    console.log(`TOTAL ORDERS IN DB: ${orders.length}`);
    orders.forEach(o => {
        console.log(`Order ID: ${o.id} | Clinic: ${o.clinic.name} (${o.clinicId}) | Patient: ${o.patient.name} | Type: ${o.type} | Created At: ${o.createdAt}`);
    });

    const records = await prisma.medicalrecord.findMany({
        include: { clinic: true, patient: true },
        orderBy: { createdAt: 'desc' }
    });
    console.log(`\nTOTAL MEDICAL RECORDS IN DB: ${records.length}`);
    records.forEach(r => {
        console.log(`Record ID: ${r.id} | Clinic: ${r.clinic.name} (${r.clinicId}) | Patient: ${r.patient.name} | Created At: ${r.createdAt}`);
    });

    process.exit(0);
}
checkEveryOrder();
