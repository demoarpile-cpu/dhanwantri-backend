
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = 'doctor@ev-clinic.com'; // Trying this one as seen in logs
    const email2 = 'd@gmail.com'; // The one from earlier
    const email3 = 'admin@ev-clinic.com';

    const users = await prisma.user.findMany({
        where: {
            email: { in: [email, email2, email3] }
        },
        include: {
            clinicstaff: true
        }
    });

    console.log('Users found:', JSON.stringify(users, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
