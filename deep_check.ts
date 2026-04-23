import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
    const clinics = await prisma.clinic.findMany({
        orderBy: { id: 'desc' }
    });
    console.log('--- LATEST CLINICS ---');
    clinics.forEach(c => console.log(`ID: ${c.id} | Name: ${c.name}`));

    const latestOrders = await prisma.service_order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { patient: true, clinic: true }
    });

    console.log('\n--- LATEST 10 ORDERS ---');
    latestOrders.forEach(o => {
        console.log(`Order ID: ${o.id} | Clinic: ${o.clinic.name} (${o.clinicId}) | Patient: ${o.patient.name} | Type: ${o.type} | Created: ${o.createdAt}`);
    });

    const pooja = clinics.find(c => c.name.toLowerCase().includes('pooja'));
    if (pooja) {
        console.log(`\n--- POOJA CLINIC (${pooja.id}) STAFF ---`);
        const staff = await prisma.clinicstaff.findMany({
            where: { clinicId: pooja.id },
            include: { user: true }
        });
        staff.forEach(s => console.log(`Staff: ${s.user.name} | Email: ${s.user.email} | Role: ${s.role}`));

        const poojaOrders = await prisma.service_order.findMany({
            where: { clinicId: pooja.id }
        });
        console.log(`\nFound ${poojaOrders.length} orders specifically for Pooja Clinic`);
    } else {
        console.log('\nPOOJA CLINIC NOT FOUND IN DATABASE');
    }

    process.exit(0);
}
check();
