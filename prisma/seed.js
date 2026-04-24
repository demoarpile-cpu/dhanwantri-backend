import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
async function main() {
    console.log('🌱 Starting Clean Seed...');
    // 1. Clean Database
    console.log('🧹 Cleaning existing data...');
    await prisma.service_order.deleteMany();
    await prisma.inventory.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.medicalrecord.deleteMany();
    await prisma.formresponse.deleteMany();
    await prisma.appointment.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.clinicstaff.deleteMany();
    await prisma.department.deleteMany();
    await prisma.formtemplate.deleteMany();
    await prisma.auditlog.deleteMany();
    await prisma.patient.deleteMany();
    await prisma.subscription_invoice.deleteMany();
    await prisma.clinic.deleteMany();
    await prisma.user.deleteMany();
    console.log('✅ Database cleaned.');
    const adminPasswordHash = await bcrypt.hash('admin123', 12);
    // 2. Create Super Admin User
    console.log('👤 Creating Super Admin...');
    await prisma.user.create({
        data: {
            email: 'superadmin@ev.com',
            password: adminPasswordHash,
            name: 'Super Admin',
            role: 'SUPER_ADMIN',
            status: 'active'
        }
    });
    // 3. Create Multi-Clinic Admin User
    console.log('👤 Creating Clinic Admin (Multi-Clinic User)...');
    const clinicAdminUser = await prisma.user.create({
        data: {
            email: 'admin@ev-clinic.com',
            password: adminPasswordHash,
            name: 'Clinic Administrator',
            role: 'ADMIN',
            status: 'active'
        }
    });
    // 4. Create The Clinics (Husri, Skaf, Ghannam)
    const clinicNames = [
        { name: 'Husri Clinic', subdomain: 'husri' },
        { name: 'Skaf Clinic', subdomain: 'skaf' },
        { name: 'Ghannam Clinic', subdomain: 'ghannam' }
    ];
    console.log('🏥 Creating 3 Clinics for Multi-Tenant Testing...');
    for (const data of clinicNames) {
        const clinic = await prisma.clinic.create({
            data: {
                name: data.name,
                subdomain: data.subdomain,
                location: 'Medical District, Dubai',
                contact: '+971 4 000 0000',
                email: `info@${data.subdomain}.online`,
                status: 'active',
                modules: JSON.stringify({
                    pharmacy: true,
                    radiology: true,
                    laboratory: true,
                    billing: true,
                    reports: true
                }),
                subscriptionPlan: 'Yearly',
                subscriptionStart: new Date(),
                subscriptionEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
                isActive: true
            }
        });
        // Assign Admin to this clinic
        await prisma.clinicstaff.create({
            data: {
                userId: clinicAdminUser.id,
                clinicId: clinic.id,
                role: 'ADMIN',
                department: 'Administration'
            }
        });
        // Add dummy Doctor for each clinic
        const docUser = await prisma.user.create({
            data: {
                email: `doctor@${data.subdomain}.com`,
                password: adminPasswordHash,
                name: `Dr. John (${data.name})`,
                role: 'DOCTOR',
                status: 'active'
            }
        });
        // Create Default Departments
        console.log(`🏢 Creating Departments for ${clinic.name}...`);
        const depts = [
            { name: 'Administration', type: 'CLINICAL' },
            { name: 'Clinical', type: 'CLINICAL' },
            { name: 'Laboratory', type: 'SERVICE' },
            { name: 'Pharmacy', type: 'SERVICE' },
            { name: 'Radiology', type: 'SERVICE' }
        ];
        for (const dept of depts) {
            await prisma.department.create({
                data: {
                    clinicId: clinic.id,
                    name: dept.name,
                    type: dept.type
                }
            });
        }
        await prisma.clinicstaff.create({
            data: {
                userId: docUser.id,
                clinicId: clinic.id,
                role: 'DOCTOR',
                department: 'Clinical',
                specialty: 'General Medicine'
            }
        });
        // Create Default Form Templates
        console.log(`📝 Creating Default Assessment Templates for ${clinic.name}...`);
        await prisma.formtemplate.create({
            data: {
                clinicId: clinic.id,
                name: 'General Clinical Assessment',
                specialty: 'General Medicine',
                status: 'published',
                version: 1,
                fields: JSON.stringify([
                    {
                        id: 'chiefComplaint',
                        type: 'textarea',
                        label: 'Chief Complaint',
                        required: true,
                        placeholder: 'Patient\'s primary reason for visit'
                    },
                    {
                        id: 'symptoms',
                        type: 'textarea',
                        label: 'Symptoms',
                        required: true,
                        placeholder: 'List of symptoms reported'
                    },
                    {
                        id: 'vitals',
                        type: 'text',
                        label: 'Vitals (BP, HR, Temp)',
                        required: false,
                        placeholder: 'e.g. 120/80, 72bpm, 36.5C'
                    },
                    {
                        id: 'examination',
                        type: 'textarea',
                        label: 'Physical Examination Findings',
                        required: true,
                        placeholder: 'Observations from physical exam'
                    }
                ])
            }
        });
    }
    // 5. Create Demo Users for Magic Login (matching UI)
    console.log('👤 Creating Demo Users for Magic Login UI...');
    const firstClinic = await prisma.clinic.findFirst({ where: { subdomain: 'husri' } });
    if (firstClinic) {
        // Specialist Doctor
        const demoDoc = await prisma.user.create({
            data: {
                email: 'doctor@ev-clinic.com',
                password: adminPasswordHash,
                name: 'Dr. Specialist (Demo)',
                role: 'DOCTOR',
                status: 'active'
            }
        });
        await prisma.clinicstaff.create({
            data: {
                userId: demoDoc.id,
                clinicId: firstClinic.id,
                role: 'DOCTOR',
                department: 'Clinical',
                specialty: 'Specialist'
            }
        });
        // Receptionist
        const demoRecep = await prisma.user.create({
            data: {
                email: 'reception@ev-clinic.com',
                password: adminPasswordHash,
                name: 'Receptionist (Demo)',
                role: 'RECEPTIONIST',
                status: 'active'
            }
        });
        await prisma.clinicstaff.create({
            data: {
                userId: demoRecep.id,
                clinicId: firstClinic.id,
                role: 'RECEPTIONIST',
                department: 'Front Desk'
            }
        });
        // Pharmacist
        const demoPharma = await prisma.user.create({
            data: {
                email: 'pharma@ev-clinic.com',
                password: adminPasswordHash,
                name: 'Pharmacist (Demo)',
                role: 'PHARMACY',
                status: 'active'
            }
        });
        await prisma.clinicstaff.create({
            data: {
                userId: demoPharma.id,
                clinicId: firstClinic.id,
                role: 'PHARMACY',
                department: 'Pharmacy'
            }
        });
        // Lab Technician
        const demoLab = await prisma.user.create({
            data: {
                email: 'lab@ev-clinic.com',
                password: adminPasswordHash,
                name: 'Lab Tech (Demo)',
                role: 'LAB',
                status: 'active'
            }
        });
        await prisma.clinicstaff.create({
            data: {
                userId: demoLab.id,
                clinicId: firstClinic.id,
                role: 'LAB',
                department: 'Laboratory'
            }
        });
        // Radiologist
        const demoRadio = await prisma.user.create({
            data: {
                email: 'radio@ev-clinic.com',
                password: adminPasswordHash,
                name: 'Radiologist (Demo)',
                role: 'RADIOLOGY',
                status: 'active'
            }
        });
        await prisma.clinicstaff.create({
            data: {
                userId: demoRadio.id,
                clinicId: firstClinic.id,
                role: 'RADIOLOGY',
                department: 'Radiology'
            }
        });
        // Accountant
        const demoAccountant = await prisma.user.create({
            data: {
                email: 'accountant@ev-clinic.com',
                password: adminPasswordHash,
                name: 'Accountant (Demo)',
                role: 'ACCOUNTANT',
                status: 'active'
            }
        });
        await prisma.clinicstaff.create({
            data: {
                userId: demoAccountant.id,
                clinicId: firstClinic.id,
                role: 'ACCOUNTANT',
                department: 'Finance'
            }
        });
        // Document Controller
        const demoDocs = await prisma.user.create({
            data: {
                email: 'docs@ev-clinic.com',
                password: adminPasswordHash,
                name: 'Doc Controller (Demo)',
                role: 'DOCUMENT_CONTROLLER',
                status: 'active'
            }
        });
        await prisma.clinicstaff.create({
            data: {
                userId: demoDocs.id,
                clinicId: firstClinic.id,
                role: 'DOCUMENT_CONTROLLER',
                department: 'Administration'
            }
        });
        // 6. Create Case Study Data: Aisha Khan
        console.log('📝 Creating Case Study Data: Aisha Khan...');
        // Add Panadol to Inventory
        await prisma.inventory.create({
            data: {
                clinicId: firstClinic.id,
                name: 'Panadol (500mg)',
                sku: 'PH-PAN-001',

                quantity: 100,
                unitPrice: 15.00,
                expiryDate: new Date('2026-12-31')
            }
        });
        // Add Aisha as User (for login)
        const aishaUser = await prisma.user.create({
            data: {
                email: 'aisha@example.com',
                password: adminPasswordHash,
                name: 'Aisha Khan',
                role: 'PATIENT',
                status: 'active'
            }
        });
        // Add Aisha as Patient record
        const aisha = await prisma.patient.create({
            data: {
                clinicId: firstClinic.id,
                name: 'Aisha Khan',
                email: 'aisha@example.com',
                phone: '+971 55 999 8888',
                gender: 'Female',
                age: 28,
                status: 'Active',
                mrn: 'MRN-AI-001'
            }
        });
        // Add Active Appointment (Checked In)
        await prisma.appointment.create({
            data: {
                clinicId: firstClinic.id,
                patientId: aisha.id,
                doctorId: demoDoc.id,
                date: new Date(),
                time: '10:30',
                status: 'Checked In',
                source: 'Walk-in',
                notes: 'Aisha is waiting in the clinic for her fever checkup.'
            }
        });
        // Add a Pending Lab Order for her (to simulate doctor work)
        await prisma.service_order.create({
            data: {
                clinicId: firstClinic.id,
                patientId: aisha.id,
                doctorId: demoDoc.id,
                type: 'LAB',
                testName: 'CBC Blood Test',
                paymentStatus: 'Pending',
                testStatus: 'Pending'
            }
        });
    }
    console.log('✅ Seeding Complete! Aisha Khan is now waiting in Husri Clinic.');
    console.log('👉 Login: admin@ev-clinic.com / admin123');
}
main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
