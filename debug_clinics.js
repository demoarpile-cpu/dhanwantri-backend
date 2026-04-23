import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkNewClinics() {
    const clinics = await prisma.clinic.findMany({
        orderBy: { id: 'desc' },
        take: 5,
        include: {
            clinicstaff: {
                include: {
                    user: true
                }
            }
        }
    });

    console.log(JSON.stringify(clinics, null, 2));
    await prisma.$disconnect();
}

checkNewClinics();
