import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
    try {
        // Fix users with empty roles
        const result = await prisma.$executeRawUnsafe(`UPDATE user SET role = 'RECEPTIONIST' WHERE role = '' OR role IS NULL`);
        fs.writeFileSync('raw_fix_result.txt', `Fixed ${result} rows in user table\n`, 'utf8');

        // Fix clinicstaff with empty roles
        const result2 = await prisma.$executeRawUnsafe(`UPDATE clinicstaff SET role = 'RECEPTIONIST' WHERE role = '' OR role IS NULL`);
        fs.appendFileSync('raw_fix_result.txt', `Fixed ${result2} rows in clinicstaff table\n`, 'utf8');

        // Also fix common misspellings if any
        await prisma.$executeRawUnsafe(`UPDATE user SET role = 'PHARMACY' WHERE role = 'PHARMACIST'`);
        await prisma.$executeRawUnsafe(`UPDATE user SET role = 'RECEPTIONIST' WHERE role = 'RECEPTION'`);
        await prisma.$executeRawUnsafe(`UPDATE user SET role = 'LAB' WHERE role = 'LAB_TECHNICIAN'`);
        await prisma.$executeRawUnsafe(`UPDATE user SET role = 'RADIOLOGY' WHERE role = 'RADIOLOGIST'`);

        await prisma.$executeRawUnsafe(`UPDATE clinicstaff SET role = 'PHARMACY' WHERE role = 'PHARMACIST'`);
        await prisma.$executeRawUnsafe(`UPDATE clinicstaff SET role = 'RECEPTIONIST' WHERE role = 'RECEPTION'`);
        await prisma.$executeRawUnsafe(`UPDATE clinicstaff SET role = 'LAB' WHERE role = 'LAB_TECHNICIAN'`);
        await prisma.$executeRawUnsafe(`UPDATE clinicstaff SET role = 'RADIOLOGY' WHERE role = 'RADIOLOGIST'`);

    } catch (e) {
        fs.writeFileSync('raw_fix_result.txt', `Error: ${e.message}\n${e.stack}`, 'utf8');
    } finally {
        await prisma.$disconnect();
    }
}

main();
