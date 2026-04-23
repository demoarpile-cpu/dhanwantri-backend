import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkStaff() {
    const emails = [
        'pharma@ev-clinic.com',
        'lab@ev-clinic.com',
        'radio@ev-clinic.com',
        'accountant@ev-clinic.com',
        'docs@ev-clinic.com',
        'doctor@ev-clinic.com'
    ];

    for (const email of emails) {
        const user = await prisma.user.findUnique({
            where: { email },
            include: { clinicstaff: { include: { clinic: true } } }
        });

        if (user) {
            console.log(`User: ${email} (Role: ${user.role})`);
            user.clinicstaff.forEach(cs => {
                console.log(`  - Clinic: ${cs.clinicId} (${cs.clinic.name}), Role: ${cs.role}`);
            });
        } else {
            console.log(`User: ${email} NOT FOUND`);
        }
    }
    process.exit(0);
}

checkStaff();
