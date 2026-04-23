import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
    try {
        const users = await prisma.user.findMany({
            select: { email: true, password: true, role: true }
        });
        fs.writeFileSync('user_inspect.txt', JSON.stringify(users, null, 2), 'utf8');
    } catch (e) {
        fs.writeFileSync('user_inspect.txt', `Error: ${e.message}`, 'utf8');
    } finally {
        await prisma.$disconnect();
    }
}

main();
