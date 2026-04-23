
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const templates = await prisma.formtemplate.findMany();
    console.log('Current templates:', JSON.stringify(templates, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
