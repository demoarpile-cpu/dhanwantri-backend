import { prisma } from '../lib/prisma.js';
import { AppError } from '../utils/AppError.js';

// ==================== TEMPLATES ====================

export const getTemplates = async (clinicId: number) => {
    console.log(`[FORM SERVICE] Fetching templates for Clinic ID: ${clinicId}`);
    return await prisma.formtemplate.findMany({
        where: {
            OR: [
                { clinicId: Number(clinicId) },
                { clinicId: null }
            ]
        },
        orderBy: { name: 'asc' }
    });
};

export const getTemplateById = async (clinicId: number, templateId: number) => {
    const template = await prisma.formtemplate.findUnique({
        where: { id: templateId }
    });

    if (!template) throw new AppError('Template not found', 404);
    if (template.clinicId && template.clinicId !== clinicId) {
        throw new AppError('Unauthorized access to this template', 403);
    }

    return {
        ...template,
        fields: JSON.parse(template.fields)
    };
};

export const createTemplate = async (clinicId: number, data: any, userId: number) => {
    const { name, specialty, fields, status } = data;

    // Basic validation
    if (!name || !fields) throw new AppError('Name and fields are required', 400);

    const template = await prisma.formtemplate.create({
        data: {
            clinicId,
            name,
            specialty: specialty || 'General',
            fields: typeof fields === 'string' ? fields : JSON.stringify(fields),
            status: status || 'draft',
            version: 1
        }
    });

    await prisma.auditlog.create({
        data: {
            action: 'Form Template Created',
            performedBy: `User:${userId}`,
            clinicId,
            details: JSON.stringify({ templateId: template.id, name })
        }
    });

    return template;
};

export const updateTemplate = async (clinicId: number, templateId: number, data: any, userId: number) => {
    const template = await prisma.formtemplate.findUnique({ where: { id: templateId } });
    if (!template) throw new AppError('Template not found', 404);
    if (template.clinicId !== clinicId) throw new AppError('Unauthorized', 403);

    // If published, maybe bump version? For now, we allow direct edits but could be stricter.
    const newVersion = template.status === 'published' && data.status === 'draft' ? template.version + 1 : template.version;

    const updated = await prisma.formtemplate.update({
        where: { id: templateId },
        data: {
            name: data.name || undefined,
            specialty: data.specialty || undefined,
            fields: data.fields ? (typeof data.fields === 'string' ? data.fields : JSON.stringify(data.fields)) : undefined,
            status: data.status || undefined,
            version: newVersion
        }
    });

    await prisma.auditlog.create({
        data: {
            action: 'Form Template Updated',
            performedBy: `User:${userId}`,
            clinicId,
            details: JSON.stringify({ templateId, version: newVersion })
        }
    });

    return updated;
};

export const deleteTemplate = async (clinicId: number, templateId: number, userId: number) => {
    const template = await prisma.formtemplate.findUnique({ where: { id: templateId } });
    if (!template) throw new AppError('Template not found', 404);
    if (template.clinicId !== clinicId) throw new AppError('Unauthorized', 403);

    await prisma.formtemplate.delete({ where: { id: templateId } });

    await prisma.auditlog.create({
        data: {
            action: 'Form Template Deleted',
            performedBy: `User:${userId}`,
            clinicId,
            details: JSON.stringify({ templateId, name: template.name })
        }
    });

    return { success: true };
};

// ==================== RESPONSES ====================

export const submitResponse = async (clinicId: number, userId: number, data: any) => {
    const { formId, patientId, answers } = data;

    if (!formId || !patientId || !answers) throw new AppError('Missing required fields', 400);

    const template = await prisma.formtemplate.findUnique({ where: { id: Number(formId) } });
    if (!template) throw new AppError('Form template not found', 404);

    // Validate answers against template fields
    const fields = JSON.parse(template.fields);
    const parsedAnswers = typeof answers === 'string' ? JSON.parse(answers) : answers;

    // Check required fields
    for (const field of fields) {
        if (field.required && (parsedAnswers[field.id] === undefined || parsedAnswers[field.id] === '')) {
            throw new AppError(`Missing required field: ${field.label}`, 400);
        }
    }

    const response = await prisma.formresponse.create({
        data: {
            clinicId,
            formId: Number(formId),
            patientId: Number(patientId),
            doctorId: userId,
            answers: JSON.stringify(parsedAnswers)
        },
        include: {
            formtemplate: { select: { name: true, specialty: true } },
            patient: { select: { name: true, mrn: true } }
        }
    });

    // Also update patient Last Visit or create a Medical Record entry?
    // Let's create a medical record entry for visibility in history
    await prisma.medicalrecord.create({
        data: {
            clinicId,
            patientId: Number(patientId),
            doctorId: userId,
            templateId: Number(formId),
            type: 'Assessment',
            data: JSON.stringify({
                responseId: response.id,
                formName: template.name,
                summary: `Completed ${template.name}`
            }),
            isClosed: true
        }
    });

    return response;
};

export const getAllResponses = async (clinicId: number) => {
    const responses = await prisma.formresponse.findMany({
        where: { clinicId },
        include: {
            formtemplate: { select: { name: true, version: true } },
            patient: { select: { name: true, id: true } }
        },
        orderBy: { submittedAt: 'desc' }
    });

    return responses.map(r => ({
        id: r.id,
        patientId: r.patientId,
        patientName: r.patient.name,
        formName: r.formtemplate.name,
        date: r.submittedAt,
        type: r.formtemplate.name,
        answers: JSON.parse(r.answers)
    }));
};

export const getPatientResponses = async (clinicId: number, patientId: number) => {
    const responses = await prisma.formresponse.findMany({
        where: { clinicId, patientId: Number(patientId) },
        include: {
            formtemplate: { select: { name: true, version: true } },
            clinic: { select: { name: true } } // In case accessed by Super Admin
        },
        orderBy: { submittedAt: 'desc' }
    });

    return responses.map(r => ({
        id: r.id,
        formName: r.formtemplate.name,
        date: r.submittedAt,
        answers: JSON.parse(r.answers)
    }));
};

export const getResponseById = async (clinicId: number, responseId: number) => {
    const response = await prisma.formresponse.findUnique({
        where: { id: responseId },
        include: {
            formtemplate: true,
            patient: true
        }
    });

    if (!response) throw new AppError('Response not found', 404);
    if (response.clinicId !== clinicId) throw new AppError('Unauthorized', 403);

    return {
        ...response,
        answers: JSON.parse(response.answers),
        fields: JSON.parse(response.formtemplate.fields)
    };
};
