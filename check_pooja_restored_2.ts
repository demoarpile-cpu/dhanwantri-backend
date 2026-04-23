import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkPoojaState() {
    const pooja = await prisma.clinic.findFirst({
        where: { name: { contains: 'Pooja' } }
    });

    if (!pooja) {
        console.log('POOJA_CLINIC_NOT_FOUND');
        process.exit(0);
    }

    console.log(`CLINIC_FOUND: ${pooja.id} | Name: ${pooja.name} | Subdomain: ${pooja.subdomain}`);

    const staff = await prisma.clinicstaff.findMany({
        where: { clinicId: pooja.id },
        include: { user: true }
    });
    console.log('\nSTAFF_LIST:');
    staff.forEach(s => console.log(`User: ${s.user.name} | Email: ${s.user.email} | Role: ${s.role}`));

    const patients = await prisma.patient.findMany({
        where: { clinicId: pooja.id }
    });
    console.log('\nPATIENTS_LIST:');
    patients.forEach(p => console.log(`Patient: ${p.name} (ID: ${p.id})`));

    const orders = await prisma.service_order.findMany({
        where: { clinicId: pooja.id },
        include: { patient: true }
    });
    console.log(`\nORDERS_FOUND: ${orders.length}`);
    orders.forEach(o => console.log(`Order ID: ${o.id} | Type: ${o.type} | Patient: ${o.patient.name} | Status: ${o.status}`));

    const records = await prisma.medicalrecord.findMany({
        where: { clinicId: pooja.id }
    });
    console.log(`\nMEDICAL_RECORDS_FOUND: ${records.length}`);

    process.exit(0);
}

checkPoojaState();
