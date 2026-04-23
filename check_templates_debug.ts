import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const templates = await prisma.formtemplate.findMany();
        console.log('Total templates found:', templates.length);
        console.table(templates.map(t => ({
            id: t.id,
            name: t.name,
            clinicId: t.clinicId,
            status: t.status
        })));

        const countNull = templates.filter(t => t.clinicId === null).length;
        console.log(`Global templates (clinicId=null): ${countNull}`);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
