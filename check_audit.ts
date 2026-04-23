import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkAudit() {
    const logs = await prisma.auditlog.findMany({
        orderBy: { timestamp: 'desc' },
        take: 20
    });
    console.log('--- LATEST AUDIT LOGS ---');
    logs.forEach(l => console.log(`${l.timestamp} | ${l.action} | ${l.performedBy} | ${l.details}`));
    process.exit(0);
}
checkAudit();
