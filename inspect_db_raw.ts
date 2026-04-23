import { PrismaClient } from '@prisma/client';
import fs from 'fs';
const prisma = new PrismaClient();

async function check() {
    let output = '';
    try {
        const result: any[] = await prisma.$queryRawUnsafe(`DESCRIBE clinicstaff`);
        output += '---DESCRIBE_START---\n';
        output += JSON.stringify(result, null, 2) + '\n';
        output += '---DESCRIBE_END---\n';

        const data: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM clinicstaff`);
        output += '---DATA_START---\n';
        output += JSON.stringify(data, null, 2) + '\n';
        output += '---DATA_END---\n';

    } catch (e: any) {
        output += 'Error: ' + e.message;
    }
    fs.writeFileSync('db_raw_check.txt', output);
}

check().catch(console.error).finally(() => prisma.$disconnect());
