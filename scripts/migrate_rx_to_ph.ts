import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrate() {
    console.log('--- MIGRATION START ---');
    console.log('Environment:', process.env.DATABASE_URL ? 'DB URL SET' : 'DB URL NOT SET');
    console.log('Starting migration from RX- to PH-...');


    try {
        const allInvoices = await prisma.invoice.findMany({ select: { id: true } });
        console.log('All Invoice IDs:', allInvoices.map(i => i.id).join(', '));

        const invoices = await prisma.invoice.findMany({
            where: {
                id: { contains: 'RX-' }
            }
        });


        console.log(`Found ${invoices.length} invoices to migrate.`);

        for (const inv of invoices) {
            const oldId = inv.id;
            const newId = oldId.replace('RX-', 'PH-');

            console.log(`Migrating ${oldId} -> ${newId}`);

            await prisma.$transaction(async (tx) => {
                // 1. Create new invoice
                await tx.invoice.create({
                    data: {
                        ...inv,
                        id: newId
                    }
                });

                // 2. Update service_order result JSON references
                const orders = await tx.service_order.findMany({
                    where: {
                        result: { contains: oldId }
                    }
                });

                for (const order of orders) {
                    if (order.result) {
                        const updatedResult = order.result.replace(new RegExp(oldId, 'g'), newId);
                        await tx.service_order.update({
                            where: { id: order.id },
                            data: { result: updatedResult }
                        });
                    }
                }

                // 3. Delete old invoice
                await tx.invoice.delete({
                    where: { id: oldId }
                });
            });
        }

        console.log('Migration completed successfully.');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

migrate();
