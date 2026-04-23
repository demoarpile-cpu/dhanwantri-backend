import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const clinics = await prisma.clinic.findMany();
    if (clinics.length > 1) {
        const mainClinic = clinics.find(c => c.name.includes("Exclusive Vision")) || clinics[0];
        console.log(`Keeping clinic: ${mainClinic.name} (ID: ${mainClinic.id})`);

        // Delete all other clinics
        // Note: Due to foreign key constraints, we might need to delete related data if not on cascade delete.
        // However, usually it's better to just keep one in the UI first or delete carefully.

        const others = clinics.filter(c => c.id !== mainClinic.id);
        for (const clinic of others) {
            console.log(`Deleting clinic: ${clinic.name} (ID: ${clinic.id})...`);
            try {
                await prisma.clinic.delete({ where: { id: clinic.id } });
            } catch (e) {
                console.error(`Failed to delete clinic ${clinic.id}:`, e.message);
            }
        }
    } else {
        console.log('Only one clinic found or no clinics found.');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
