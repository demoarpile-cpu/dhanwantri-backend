
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAndSeedDoctor() {
    try {
        const doctors = await prisma.clinicstaff.findMany({
            where: {
                clinicId: 1,
                role: 'DOCTOR'
            },
            include: { user: true }
        });

        console.log(`Found ${doctors.length} doctors.`);

        if (doctors.length === 0) {
            console.log('No doctors found. Creating Dr. Strange...');

            // Create User
            const user = await prisma.user.upsert({
                where: { email: 'doctor@ev.com' },
                update: {},
                create: {
                    name: 'Dr. Stephen Strange',
                    email: 'doctor@ev.com',
                    password: 'password123', // In a real app this would be hashed
                    phone: '+15555555555',
                    role: 'DOCTOR'
                }

            });

            // Create Staff Entry
            await prisma.clinicstaff.create({
                data: {
                    userId: user.id,
                    clinicId: 1,
                    role: 'DOCTOR',
                    department: 'General'
                }
            });

            console.log('Doctor created!');
        } else {
            console.log('Doctors exist:', doctors.map(d => d.user.name));
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkAndSeedDoctor();
