import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const settings = await prisma.system_settings.findMany();
    if (settings.length === 0) {
        console.log('No settings found. Creating default SMTP settings...');
        await prisma.system_settings.createMany({
            data: [
                { key: 'SMTP_HOST', value: 'smtp.gmail.com', description: 'SMTP server host' },
                { key: 'SMTP_PORT', value: '587', description: 'SMTP server port' },
                { key: 'SMTP_USER', value: 'otp@exclusivevision.com', description: 'SMTP user email' },
                { key: 'SMTP_PASS', value: 'your-app-password', description: 'SMTP password or app-specific password' },
                { key: 'SMTP_FROM', value: 'Exclusive Vision <otp@exclusivevision.com>', description: 'Email sender name and email' }
            ]
        });
        console.log('Default SMTP settings created.');
    } else {
        console.log('Current Settings:', JSON.stringify(settings, null, 2));
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
