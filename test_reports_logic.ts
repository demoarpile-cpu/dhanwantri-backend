import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function test() {
    try {
        const clinicId = 13; // Sample clinic ID from previous logs
        const dateStr = '2026-02-19';

        console.log(`Testing getDailySalesReports for clinic ${clinicId} on ${dateStr}`);

        const startOfDay = new Date(dateStr);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(dateStr);
        endOfDay.setHours(23, 59, 59, 999);

        console.log("Date range:", startOfDay, "to", endOfDay);

        const invoices = await prisma.invoice.findMany({
            where: {
                clinicId,
                createdAt: {
                    gte: startOfDay,
                    lte: endOfDay
                },
                OR: [
                    { service: { contains: 'Pharmacy:' } },
                    { service: { contains: 'Direct Sale:' } }
                ]
            },
            include: {
                patient: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        console.log("Found invoices:", invoices.length);

        const dailyStats = {
            totalCount: invoices.length,
            totalRevenue: invoices.reduce((sum, inv) => sum + Number(inv.amount), 0),
            medicines: [] as any[]
        };

        const medicineMap = new Map<string, { quantity: number, total: number }>();

        invoices.forEach(inv => {
            const content = inv.service.replace('Pharmacy: ', '').replace('Direct Sale: ', '');
            const items = content.split(', ');
            items.forEach(itemStr => {
                const parts = itemStr.trim().split(' x');
                if (parts.length >= 2) {
                    const qty = Number(parts[parts.length - 1]);
                    const name = parts.slice(0, parts.length - 1).join(' x');

                    const current = medicineMap.get(name) || { quantity: 0, total: 0 };
                    medicineMap.set(name, {
                        quantity: current.quantity + qty,
                        total: 0
                    });
                }
            });
        });

        dailyStats.medicines = Array.from(medicineMap.entries()).map(([name, data]) => ({
            name,
            quantity: data.quantity,
            totalAmount: 0
        }));

        console.log("Daily stats:", dailyStats);

        type ShiftKey = 'Morning' | 'Evening' | 'Night';
        const shiftStats: Record<ShiftKey, { count: number, revenue: number, medicines: any[] }> = {
            Morning: { count: 0, revenue: 0, medicines: [] },
            Evening: { count: 0, revenue: 0, medicines: [] },
            Night: { count: 0, revenue: 0, medicines: [] }
        };

        const getShift = (date: Date): ShiftKey => {
            const h = date.getHours();
            if (h >= 6 && h < 14) return 'Morning';
            if (h >= 14 && h < 22) return 'Evening';
            return 'Night';
        };

        const shiftMedicineMaps = {
            Morning: new Map<string, number>(),
            Evening: new Map<string, number>(),
            Night: new Map<string, number>()
        };

        invoices.forEach(inv => {
            const shift = getShift(new Date(inv.createdAt));
            shiftStats[shift].count++;
            shiftStats[shift].revenue += Number(inv.amount);

            const content = inv.service.replace('Pharmacy: ', '').replace('Direct Sale: ', '');
            const items = content.split(', ');
            items.forEach(itemStr => {
                const parts = itemStr.trim().split(' x');
                if (parts.length >= 2) {
                    const qty = Number(parts[parts.length - 1]);
                    const name = parts.slice(0, parts.length - 1).join(' x');

                    const currentQty = shiftMedicineMaps[shift].get(name) || 0;
                    shiftMedicineMaps[shift].set(name, currentQty + qty);
                }
            });
        });

        (Object.keys(shiftStats) as ShiftKey[]).forEach(shift => {
            shiftStats[shift].medicines = Array.from(shiftMedicineMaps[shift].entries()).map(([name, qty]) => ({
                name,
                quantity: qty,
                totalAmount: 0
            }));
        });

        console.log("Shift stats:", shiftStats);
        console.log("TEST SUCCESSFUL");

    } catch (e) {
        console.error("TEST FAILED:", e);
    } finally {
        await prisma.$disconnect();
    }
}

test();
