
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = 'superadmin@ev.com';
    const user = await prisma.user.findUnique({
        where: { email },
        include: {
            clinicstaff: true
        }
    });

    if (!user) {
        console.log('User NOT FOUND: superadmin@ev.com');
    } else {
        console.log('User FOUND:');
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
