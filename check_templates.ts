import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
    const templates = await prisma.formtemplate.findMany();
    console.log('Total templates:', templates.length);
    console.log('Templates:', JSON.stringify(templates, null, 2));
    process.exit(0);
}

check();
