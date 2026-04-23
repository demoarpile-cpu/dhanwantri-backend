import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testRoles() {
    console.log('\n🔍 Testing Role Assignments...\n');

    const users = await prisma.user.findMany({
        where: {
            email: {
                in: [
                    'admin@ev-clinic.com',
                    'doctor@ev-clinic.com',
                    'reception@ev-clinic.com'
                ]
            }
        },
        include: {
            clinicstaff: {
                include: {
                    clinic: true
                }
            }
        }
    });

    for (const user of users) {
        console.log(`\n📧 Email: ${user.email}`);
        console.log(`   User Table Role: ${user.role}`);
        console.log(`   Clinic Staff Records:`);

        for (const staff of user.clinicstaff) {
            console.log(`      - Clinic: ${staff.clinic.name}`);
            console.log(`        Role: ${staff.role}`);
            console.log(`        Department: ${staff.department || 'N/A'}`);
        }
    }

    console.log('\n✅ Role Test Complete!\n');
}

testRoles()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
