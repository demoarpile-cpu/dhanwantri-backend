import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkStaff() {
    const staff = await prisma.clinicstaff.findMany({
        include: { user: true, clinic: true }
    });
    console.log('--- ALL CLINIC STAFF ---');
    staff.forEach(s => {
        console.log(`User: ${s.user.email} | Clinic: ${s.clinic.name} (${s.clinicId}) | Role: ${s.role}`);
    });
    process.exit(0);
}
checkStaff();
