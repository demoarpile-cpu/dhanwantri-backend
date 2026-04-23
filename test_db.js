import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
    try {
        const rawUsers = await prisma.user.findMany({
            select: { id: true, email: true, role: true }
        });

        fs.writeFileSync('db_test_result.json', JSON.stringify({
            totalUsers: rawUsers.length,
            users: rawUsers
        }, null, 2), 'utf8');

        process.stdout.write('Success');
    } catch (err) {
        fs.writeFileSync('db_test_result.json', JSON.stringify({ error: err.message, stack: err.stack }, null, 2), 'utf8');
        process.stderr.write('Failure: ' + err.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
