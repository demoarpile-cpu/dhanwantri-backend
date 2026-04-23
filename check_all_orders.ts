import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkOrders() {
    const orders = await prisma.service_order.findMany({
        include: { clinic: true, patient: true }
    });
    console.log('Total Orders:', orders.length);
    orders.forEach(o => {
        console.log(`ID: ${o.id}, Clinic: ${o.clinicId} (${o.clinic?.name}), Patient: ${o.patientId} (${o.patient?.name}), Type: ${o.type}, Status: ${o.status}`);
    });
    process.exit(0);
}

checkOrders();
