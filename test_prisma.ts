import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function test() {
    try {
        console.log('Connecting to:', process.env.DATABASE_URL);
        const count = await prisma.user.count();
        console.log('User count:', count);
    } catch (error) {
        console.error('Connection failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

test();
