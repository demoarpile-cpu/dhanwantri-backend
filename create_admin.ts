import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const email = 'admin@ev-clinic.com';
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 12);

    try {
        const user = await prisma.user.upsert({
            where: { email },
            update: { password: hashedPassword },
            create: {
                email,
                password: hashedPassword,
                name: 'Admin User',
                role: 'SUPER_ADMIN',
                status: 'active'
            }
        });
        console.log('User created/updated:', user.email);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
