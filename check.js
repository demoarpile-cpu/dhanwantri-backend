import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.service_order.findMany({ where: { type: 'PHARMACY' }, take: 5 })
    .then(x => console.log(JSON.stringify(x, null, 2)))
    .catch(x => console.error(x))
    .finally(() => prisma.$disconnect());
