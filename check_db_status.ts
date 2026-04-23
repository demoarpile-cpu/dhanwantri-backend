import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
    try {
        const count = await prisma.user.count();
        const users = await prisma.user.findMany({ select: { email: true } });
        fs.writeFileSync('db_status.txt', `User count: ${count}\nUsers: ${JSON.stringify(users)}\n`, 'utf8');
    } catch (e) {
        fs.writeFileSync('db_status.txt', `Error: ${e.message}\n${e.stack}\n`, 'utf8');
    } finally {
        await prisma.$disconnect();
    }
}

main();
