import { PrismaClient } from '@prisma/client';
import fs from 'fs';
const prisma = new PrismaClient();

async function main() {
    let output = '';
    try {
        const users = await prisma.user.findMany({
            select: { id: true, email: true, role: true }
        });
        output += '---USERS_START---\n';
        output += JSON.stringify(users, null, 2) + '\n';
        output += '---USERS_END---\n';

        const clinics = await prisma.clinic.findMany();
        output += '---CLINICS_START---\n';
        output += JSON.stringify(clinics, null, 2) + '\n';
        output += '---CLINICS_END---\n';

    } catch (error: any) {
        output += 'Error fetching data: ' + error.message + '\n';
    } finally {
        fs.writeFileSync('db_check_manual.txt', output);
        await prisma.$disconnect();
    }
}

main();
