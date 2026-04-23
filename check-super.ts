import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
    const email = 'superadmin@ev.com';
    const user = await prisma.user.findUnique({
        where: { email },
        include: { clinics: true }
    });

    if (!user) {
        console.log('User not found!');
        return;
    }

    console.log('User ID:', user.id);
    console.log('Staff Records:', user.clinics.length);
    user.clinics.forEach(s => {
        console.log(`- Clinic: ${s.clinicId}, Role: ${s.role}`);
    });

    const superAdminRecord = await prisma.clinicStaff.findFirst({
        where: { userId: user.id, role: 'super_admin' }
    });
    console.log('Direct SuperAdmin Record Found:', !!superAdminRecord);
}

check().catch(console.error).finally(() => prisma.$disconnect());
