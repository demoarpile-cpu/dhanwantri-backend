
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetPassword() {
    const email = 'd@gmail.com';
    const hashedPassword = await bcrypt.hash('admin123', 12);
    await prisma.user.update({
        where: { email },
        data: { password: hashedPassword }
    });
    console.log('Password reset successfully');
}

resetPassword().finally(() => prisma.$disconnect());
