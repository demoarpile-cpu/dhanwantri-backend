import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        const users = await prisma.user.findMany({
            select: { id: true, email: true, role: true }
        });
        console.log('---USERS_START---');
        console.log(JSON.stringify(users, null, 2));
        console.log('---USERS_END---');
    } catch (error) {
        console.error('Error fetching users:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
