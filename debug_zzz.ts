import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
    const clinic = await prisma.clinic.findFirst({
        where: { name: 'zzz' }
    });
    fs.writeFileSync('zzz_detail.txt', JSON.stringify(clinic, null, 2));
    console.log('Done');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
