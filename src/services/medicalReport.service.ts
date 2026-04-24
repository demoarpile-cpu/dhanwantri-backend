import { prisma } from '../lib/prisma.js';

const DEFAULT_TEMPLATES = [
    {
        name: 'Sick Leave Report',
        fields: [
            { id: 'diagnosisSummary', label: 'Diagnosis Summary', type: 'textarea', required: true },
            { id: 'treatmentGiven', label: 'Treatment Given', type: 'textarea', required: true },
            { id: 'restDays', label: 'Recommended Rest Days', type: 'number', required: false },
            { id: 'sickLeaveFrom', label: 'Sick Leave From', type: 'date', required: false },
            { id: 'sickLeaveTo', label: 'Sick Leave To', type: 'date', required: false },
            { id: 'fitToResume', label: 'Fit to Resume Work', type: 'checkbox', required: false }
        ]
    },
    {
        name: 'Accident Report',
        fields: [
            { id: 'accidentDate', label: 'Date of Accident', type: 'date', required: true },
            { id: 'accidentDetails', label: 'Accident Details', type: 'textarea', required: true },
            { id: 'injuriesSustained', label: 'Injuries Sustained', type: 'textarea', required: true },
            { id: 'treatmentGiven', label: 'Treatment Given', type: 'textarea', required: true }
        ]
    },
    {
        name: 'Fitness Certificate',
        fields: [
            { id: 'examinationPurpose', label: 'Purpose of Examination', type: 'text', required: true },
            { id: 'generalHealth', label: 'General Health Status', type: 'textarea', required: true },
            { id: 'fitnessStatus', label: 'Fitness Status', type: 'text', required: true },
            { id: 'remarks', label: 'Remarks/Limitations', type: 'textarea', required: false }
        ]
    },
    {
        name: 'General Medical Report',
        fields: [
            { id: 'symptoms', label: 'Presenting Symptoms', type: 'textarea', required: true },
            { id: 'clinicalFindings', label: 'Clinical Findings', type: 'textarea', required: true },
            { id: 'diagnosis', label: 'Diagnosis', type: 'textarea', required: true },
            { id: 'advice', label: 'Medical Advice', type: 'textarea', required: true }
        ]
    },
    {
        name: 'Company Report',
        fields: [
            { id: 'companyName', label: 'Company Name', type: 'text', required: true },
            { id: 'employeeId', label: 'Employee ID', type: 'text', required: true },
            { id: 'occupationalHistory', label: 'Occupational History', type: 'textarea', required: false },
            { id: 'medicalClearance', label: 'Medical Clearance Status', type: 'text', required: true },
            { id: 'recommendations', label: 'Recommendations to Employer', type: 'textarea', required: false }
        ]
    }
];

export const medicalReportService = {
    async getTemplates(clinicId: number) {
        let templates = await prisma.medical_report_templates.findMany({
            where: { clinicId, isActive: true },
            orderBy: { id: 'asc' }
        });

        if (templates.length === 0) {
            // Try to seed default templates for this clinic
            try {
                const seedData = DEFAULT_TEMPLATES.map(t => ({
                    clinicId,
                    name: t.name,
                    fields: t.fields as any
                }));
                await prisma.medical_report_templates.createMany({ data: seedData });
                templates = await prisma.medical_report_templates.findMany({
                    where: { clinicId, isActive: true },
                    orderBy: { id: 'asc' }
                });
            } catch (seedError: any) {
                // If seeding fails (e.g. FK constraint), return in-memory defaults so UI still shows options
                console.warn('[Templates] Seeding failed, returning in-memory defaults:', seedError.message);
                return DEFAULT_TEMPLATES.map((t, i) => ({
                    id: -(i + 1),
                    clinicId,
                    name: t.name,
                    fields: t.fields,
                    isActive: true,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }));
            }
        }
        return templates;
    },

    async createReport(data: any) {
        const createData: any = { ...data };

        // Remove display-only fields that are not in the Prisma schema
        delete createData.patientName;
        delete createData.doctorName;
        delete createData.template; // Remove template object if included

        if (data.sickLeaveFrom) createData.sickLeaveFrom = new Date(data.sickLeaveFrom);
        if (data.sickLeaveTo) createData.sickLeaveTo = new Date(data.sickLeaveTo);
        createData.reportDate = data.reportDate ? new Date(data.reportDate) : new Date();

        return prisma.medical_report.create({
            data: createData,
            include: {
                patient: true,
                doctor: {
                    select: {
                        id: true,
                        name: true,
                        role: true
                    }
                },
                clinic: true,
                template: true
            }
        });
    },

    async getReportById(id: number) {
        return prisma.medical_report.findUnique({
            where: { id },
            include: {
                patient: true,
                doctor: {
                    select: {
                        id: true,
                        name: true,
                        role: true
                    }
                },
                clinic: true,
                template: true
            }
        });
    },

    async getReportsByClinic(clinicId: number) {
        return prisma.medical_report.findMany({
            where: { clinicId },
            include: {
                patient: {
                    select: {
                        id: true,
                        name: true,
                        mrn: true
                    }
                },
                doctor: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                template: true
            },
            orderBy: { createdAt: 'desc' }
        });
    },

    async getReportsByDoctor(doctorId: number, clinicId: number) {
        return prisma.medical_report.findMany({
            where: { doctorId, clinicId },
            include: {
                patient: {
                    select: {
                        id: true,
                        name: true,
                        mrn: true
                    }
                },
                template: true
            },
            orderBy: { createdAt: 'desc' }
        });
    },

    async getReportsByPatient(patientId: number) {
        return prisma.medical_report.findMany({
            where: { patientId },
            include: {
                doctor: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                clinic: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                template: true
            },
            orderBy: { createdAt: 'desc' }
        });
    },

    async getReportsByPatientEmail(email: string) {
        // Resolve all patient records matching this email (a user may have multiple)
        const patientRecords = await prisma.patient.findMany({
            where: { email },
            select: { id: true }
        });
        const patientIds = patientRecords.map((p: any) => p.id);

        if (patientIds.length === 0) return [];

        return prisma.medical_report.findMany({
            where: { patientId: { in: patientIds } },
            include: {
                doctor: { select: { id: true, name: true } },
                clinic: { select: { id: true, name: true } },
                template: true
            },
            orderBy: { createdAt: 'desc' }
        });
    },

    async updateReport(id: number, data: any) {
        const updateData: any = { ...data };

        // Remove display-only fields that are not in the Prisma schema
        delete updateData.patientName;
        delete updateData.doctorName;
        delete updateData.patient;
        delete updateData.doctor;
        delete updateData.template;

        if (data.sickLeaveFrom) updateData.sickLeaveFrom = new Date(data.sickLeaveFrom);
        if (data.sickLeaveTo) updateData.sickLeaveTo = new Date(data.sickLeaveTo);
        if (data.reportDate) updateData.reportDate = new Date(data.reportDate);

        return prisma.medical_report.update({
            where: { id },
            data: updateData
        });
    }
};
