import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const prisma = new PrismaClient();

async function test() {
    const logFile = 'db_test_log.txt';
    fs.writeFileSync(logFile, 'Starting DB test...\n');
    try {
        fs.appendFileSync(logFile, `Connecting to: ${process.env.DATABASE_URL}\n`);
        const count = await prisma.user.count();
        fs.appendFileSync(logFile, `User count: ${count}\n`);
    } catch (error: any) {
        fs.appendFileSync(logFile, `Error: ${error.message}\n${error.stack}\n`);
    } finally {
        await prisma.$disconnect();
    }
}

test();
