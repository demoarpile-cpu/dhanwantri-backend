import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
const prisma = new PrismaClient();

async function test() {
    let output = '';
    const email = 'sonu@gmail.com';
    const password = '123456';

    output += `Testing login for ${email}...\n`;

    const user = await prisma.user.findUnique({
        where: { email }
    });

    if (!user) {
        output += 'User not found in DB!\n';
    } else {
        const isMatch = await bcrypt.compare(password, user.password);
        output += `Password match: ${isMatch}\n`;

        if (isMatch) {
            const staff = await prisma.clinicstaff.findMany({
                where: { userId: user.id }
            });
            output += `Staff records found: ${staff.length}\n`;
            staff.forEach(s => {
                output += `- Clinic: ${s.clinicId}, Role: ${s.role}\n`;
            });
        }
    }
    fs.writeFileSync('test_login_result.txt', output);
}

test().catch(async (e) => {
    fs.writeFileSync('test_login_result.txt', 'Error: ' + e.message);
}).finally(() => prisma.$disconnect());
