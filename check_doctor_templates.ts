import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
    try {
        const user = await prisma.user.findFirst({
            where: { email: 'doctor@ev-clinic.com' },
            include: { clinicstaff: true }
        });
        console.log('User:', JSON.stringify(user, null, 2));

        if (user && user.clinicstaff.length > 0) {
            const clinicId = user.clinicstaff[0].clinicId;
            const templates = await prisma.formtemplate.findMany({
                where: {
                    OR: [
                        { clinicId: clinicId },
                        { clinicId: null }
                    ]
                }
            });
            console.log(`Templates for clinic ${clinicId}:`, templates.length);
            console.log('Template names:', templates.map(t => t.name));
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
