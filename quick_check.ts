import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
    const orders = await prisma.service_order.findMany({
        where: { clinic: { name: { contains: 'pooja' } } }
    });
    console.log('POOJA_ORDERS_COUNT:' + orders.length);
    orders.forEach(o => console.log(`ORDER:${o.id}|${o.type}|${o.testName}|${o.clinicId}`));
    process.exit(0);
}
check();
