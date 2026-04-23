import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const prisma = new PrismaClient();

async function checkRoles() {
    const logFile = 'role_check_result.txt';
    fs.writeFileSync(logFile, 'Checking database roles...\n');
    try {
        const users = await prisma.user.findMany({
            select: { email: true, role: true }
        });
        fs.appendFileSync(logFile, `Users roles: ${JSON.stringify(users, null, 2)}\n`);

        const staff = await prisma.clinicstaff.findMany({
            select: { userId: true, role: true }
        });
        fs.appendFileSync(logFile, `Staff roles: ${JSON.stringify(staff, null, 2)}\n`);

    } catch (error: any) {
        fs.appendFileSync(logFile, `ERROR during role check: ${error.message}\n`);
    } finally {
        await prisma.$disconnect();
    }
}

checkRoles();
