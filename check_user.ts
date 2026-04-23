
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = 'd@gmail.com';
    const user = await prisma.user.findUnique({
        where: { email },
        include: {
            clinicstaff: true
        }
    });

    if (!user) {
        console.log('User not found');
    } else {
        console.log('User found:');
        console.log(JSON.stringify(user, null, 2));
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
