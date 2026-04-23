import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, email: true, role: true }
        });
        const staff = await prisma.clinicstaff.findMany({
            select: { userId: true, clinicId: true, role: true }
        });
        fs.writeFileSync('db_check_final.txt', JSON.stringify({ users, staff }, null, 2), 'utf8');
    } catch (e) {
        fs.writeFileSync('db_check_final.txt', `Error: ${e.message}\n${e.stack}`, 'utf8');
    } finally {
        await prisma.$disconnect();
    }
}

main();
