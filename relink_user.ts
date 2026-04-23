
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = 'd@gmail.com';

    const user = await prisma.user.findUnique({
        where: { email }
    });

    if (user) {
        // Check if staff record exists
        const staff = await prisma.clinicstaff.findFirst({
            where: { userId: user.id }
        });

        if (!staff) {
            console.log('User exists but has no staff record. Re-linking to Clinic 33...');
            await prisma.clinicstaff.create({
                data: {
                    userId: user.id,
                    clinicId: 33, // Defaulting to clinic 33
                    role: 'DOCTOR',
                    department: 'General',
                    specialty: 'General Medicine'
                }
            });
            console.log('User re-linked successfully.');
        } else {
            console.log('User already has staff record:', staff);
        }

        // Also reset failed login attempts
        await prisma.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: 0 }
        });
        console.log('Reset failed login attempts.');
    } else {
        console.log('User not found.');
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
