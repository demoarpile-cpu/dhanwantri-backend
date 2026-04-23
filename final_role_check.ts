import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkAll() {
    const pharma = await prisma.user.findUnique({ where: { email: 'pharma@ev-clinic.com' } });
    const lab = await prisma.user.findUnique({ where: { email: 'lab@ev-clinic.com' } });
    const radio = await prisma.user.findUnique({ where: { email: 'radio@ev-clinic.com' } });
    const accountant = await prisma.user.findUnique({ where: { email: 'accountant@ev-clinic.com' } });
    const docs = await prisma.user.findUnique({ where: { email: 'docs@ev-clinic.com' } });

    console.log('Pharmacy Role:', pharma?.role);
    console.log('Lab Role:', lab?.role);
    console.log('Radio Role:', radio?.role);
    console.log('Accountant Role:', accountant?.role);
    console.log('Document Controller Role:', docs?.role);

    process.exit(0);
}

checkAll();
