import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import fs from 'fs';

async function check() {
    try {
        const count = await prisma.invoice.count();
        const pharmaCount = await prisma.invoice.count({
            where: {
                OR: [
                    { service: { contains: 'Pharmacy:' } },
                    { service: { contains: 'Direct Sale:' } }
                ]
            }
        });

        fs.writeFileSync('db_check_reports.txt', `Total Invoices: ${count}\nPharmacy Invoices: ${pharmaCount}\n`);

    } catch (e: any) {
        fs.writeFileSync('db_check_reports.txt', `ERROR: ${e.message}\n${e.stack}\n`);
    } finally {
        await prisma.$disconnect();
    }
}

check();
