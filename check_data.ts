import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const superAdmins = await prisma.user.findMany({
        where: { role: 'SUPER_ADMIN' },
        select: { id: true, email: true, name: true }
    });
    console.log('Super Admins:', JSON.stringify(superAdmins, null, 2));

    const clinicsCount = await prisma.clinic.count();
    console.log('Total Clinics:', clinicsCount);

    const demoClinic = await prisma.clinic.findFirst({
        include: {
            _count: {
                select: {
                    patient: true,
                    appointment: true,
                    clinicstaff: true
                }
            }
        }
    });
    console.log('Demo Clinic:', JSON.stringify(demoClinic, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
