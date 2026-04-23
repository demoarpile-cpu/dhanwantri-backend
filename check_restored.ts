import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
    const pooja = await prisma.clinic.findFirst({ where: { name: { contains: 'Pooja' } } });
    if (!pooja) {
        console.log('Pooja Clinic not found');
        process.exit(0);
    }
    console.log(`Checking Clinic: ${pooja.name} (${pooja.id})`);

    const orders = await prisma.service_order.findMany({
        where: { clinicId: pooja.id },
        include: { patient: true }
    });

    console.log(`Found ${orders.length} orders`);
    orders.forEach(o => console.log(`Order: ${o.id} | Patient: ${o.patient.name} | Type: ${o.type}`));

    process.exit(0);
}
check();
