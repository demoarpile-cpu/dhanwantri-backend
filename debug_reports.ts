import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
    try {
        const count = await prisma.invoice.count();
        console.log("Total Invoices:", count);

        const sample = await prisma.invoice.findFirst({
            where: {
                OR: [
                    { service: { contains: 'Pharmacy:' } },
                    { service: { contains: 'Direct Sale:' } }
                ]
            }
        });
        console.log("Sample Pharmacy Invoice:", sample);

        const dateStr = '2026-02-19';
        const startOfDay = new Date(dateStr);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(dateStr);
        endOfDay.setHours(23, 59, 59, 999);

        console.log("Query range:", startOfDay, "to", endOfDay);

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
