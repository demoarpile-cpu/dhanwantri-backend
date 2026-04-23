import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function listAll() {
    const clinics = await prisma.clinic.findMany();
    console.log('--- ALL CLINICS ---');
    clinics.forEach(c => console.log(`ID: ${c.id} | Name: ${c.name} | Sub: ${c.subdomain}`));

    const users = await prisma.user.findMany({ select: { id: true, email: true, role: true } });
    console.log('\n--- ALL USERS ---');
    users.filter(u => u.email.includes('deepak') || u.email.includes('pharma') || u.email.includes('lab') || u.email.includes('radio')).forEach(u => console.log(`ID: ${u.id} | Email: ${u.email} | Role: ${u.role}`));

    process.exit(0);
}
listAll();
