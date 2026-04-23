import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
    const pharma = await prisma.user.findUnique({ where: { email: 'pharma@ev-clinic.com' }, include: { clinicstaff: true } });
    const doctor = await prisma.user.findUnique({ where: { email: 'doctor@ev-clinic.com' }, include: { clinicstaff: true } });
    const pooja = await prisma.clinic.findFirst({ where: { name: { contains: 'pooja' } } });

    console.log('--- pooja_clinic ---');
    console.log('ID:', pooja?.id);
    console.log('Modules:', pooja?.modules);

    console.log('\n--- pharma@ev-clinic.com ---');
    console.log('Clinic IDs:', pharma?.clinicstaff.map(cs => cs.clinicId));

    console.log('\n--- doctor@ev-clinic.com ---');
    console.log('Clinic IDs:', doctor?.clinicstaff.map(cs => cs.clinicId));

    const orders = await prisma.service_order.findMany({ where: { clinicId: pooja?.id } });
    console.log('\n--- Orders in pooja_clinic ---');
    console.log('Count:', orders.length);
    orders.forEach(o => console.log(`${o.id} | ${o.type} | ${o.testName}`));

    process.exit(0);
}
run();
