import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function check() {
    const appointmentsCount = await prisma.appointment.count({ where: { doctorId: 12 } });
    console.log('Appointments for Doctor 12:', appointmentsCount);

    const recordsCount = await prisma.medicalrecord.count({ where: { doctorId: 12 } });
    console.log('Medical Records for Doctor 12:', recordsCount);

    const allPatients = await prisma.patient.findMany({
        include: { medicalrecord: { take: 1, orderBy: { createdAt: 'desc' } } }
    });
    console.log('All Clinic Patients:', JSON.stringify(allPatients, null, 2));
}
check().finally(() => prisma.$disconnect());
