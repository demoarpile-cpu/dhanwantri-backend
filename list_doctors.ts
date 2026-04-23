import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const doctors = await prisma.clinicstaff.findMany({
        where: { role: 'DOCTOR' },
        include: { user: true, clinic: true }
    });

    console.log('--- DOCTORS FOUND ---');
    doctors.forEach(d => {
        console.log(`Email: ${d.user.email} | Clinic: ${d.clinic.name} (${d.clinicId})`);
    });
}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());
