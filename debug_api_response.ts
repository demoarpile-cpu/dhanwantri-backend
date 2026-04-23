import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function simulateApi() {
    // Simulate what getPharmacyOrders(55) returns
    const orders = await prisma.service_order.findMany({
        where: {
            clinicId: 55,
            type: { in: ['PHARMACY', 'Pharmacy', 'pharmacy'] }
        },
        include: {
            patient: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' }
    });

    console.log('API RESPONSE DATA (Length):', orders.length);
    if (orders.length > 0) {
        console.log('First Order:', JSON.stringify(orders[0], null, 2));
    }

    process.exit(0);
}
simulateApi();
