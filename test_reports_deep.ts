import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function test() {
    try {
        const clinicId = 25; // Try the 'zzz' clinic from previous logs
        const dateStr = '2026-02-19';

        console.log(`Testing getDailySalesReports for clinic ${clinicId} on ${dateStr}`);

        const startOfDay = new Date(dateStr);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(dateStr);
        endOfDay.setHours(23, 59, 59, 999);

        // Try query with createdAt
        const count1 = await prisma.invoice.count({
            where: {
                clinicId,
                createdAt: { gte: startOfDay, lte: endOfDay }
            }
        });
        console.log("Count with createdAt:", count1);

        // Try query with date
        const count2 = await prisma.invoice.count({
            where: {
                clinicId,
                date: { gte: startOfDay, lte: endOfDay }
            }
        });
        console.log("Count with date:", count2);

        // Try the full logic
        const invoices = await prisma.invoice.findMany({
            where: {
                clinicId,
                createdAt: { gte: startOfDay, lte: endOfDay },
                OR: [
                    { service: { contains: 'Pharmacy:' } },
                    { service: { contains: 'Direct Sale:' } }
                ]
            },
            include: { patient: { select: { name: true } } }
        });

        console.log("Full query invoices found:", invoices.length);

        console.log("TEST FINISHED");
    } catch (e: any) {
        console.error("CRASHED:", e.message, e.stack);
    } finally {
        await prisma.$disconnect();
    }
}

test();
