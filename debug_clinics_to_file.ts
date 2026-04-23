import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
    const clinics = await prisma.clinic.findMany({
        take: 5,
        orderBy: { createdDate: 'desc' },
        select: {
            id: true,
            name: true,
            logo: true,
            createdDate: true
        }
    });
    const output = JSON.stringify(clinics, null, 2);
    fs.writeFileSync('db_check_logo.txt', output);
    console.log('Done');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
