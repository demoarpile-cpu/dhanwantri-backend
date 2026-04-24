import { prisma } from '../lib/prisma.js';
import { AppError } from '../utils/AppError.js';
export const getDocumentRecords = async (clinicId, options) => {
    const where = { clinicId };
    if (options?.patientId)
        where.patientId = options.patientId;
    if (options?.archivedOnly)
        where.isClosed = true;
    const records = await prisma.medicalrecord.findMany({
        where,
        include: {
            formtemplate: true,
            patient: { select: { name: true, id: true } }
        },
        orderBy: { createdAt: 'desc' }
    });
    return records.map(r => ({
        id: r.id,
        clinicId: r.clinicId,
        patientId: r.patient?.id ?? r.patientId,
        doctorId: r.doctorId,
        templateId: r.templateId,
        visitDate: r.visitDate || r.createdAt,
        type: r.type,
        data: r.data,
        isClosed: r.isClosed,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        patientName: r.patient?.name || 'Unknown',
        patient: r.patient ? { id: r.patient.id, name: r.patient.name } : undefined,
        date: r.visitDate || r.createdAt
    }));
};
export const getDocumentStats = async (clinicId) => {
    const [total, pending] = await Promise.all([
        prisma.medicalrecord.count({ where: { clinicId } }),
        prisma.medicalrecord.count({ where: { clinicId, isClosed: false } })
    ]);
    return { total, pending, completed: total - pending };
};
export const createDocumentRecord = async (clinicId, userId, payload) => {
    const { patientId, documentType, fileName, notes, fileData } = payload;
    const record = await prisma.medicalrecord.create({
        data: {
            clinicId,
            patientId,
            doctorId: userId,
            type: documentType,
            data: JSON.stringify({
                uploadedBy: userId,
                fileName: fileName || null,
                notes: notes || null,
                fileData: fileData || null,
                source: 'document_controller'
            }),
            isClosed: false
        }
    });
    const withPatient = await prisma.medicalrecord.findUnique({
        where: { id: record.id },
        include: { patient: { select: { name: true, id: true } } }
    });
    return {
        ...withPatient,
        patientName: withPatient?.patient?.name || 'Unknown',
        patientId: withPatient?.patient?.id
    };
};
export const getStaffDocumentRecords = async (clinicId) => {
    const records = await prisma.staff_document.findMany({
        where: { clinicId },
        include: {
            staff: {
                select: {
                    id: true,
                    userId: true,
                    role: true,
                    department: true,
                    user: { select: { name: true, email: true } }
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });
    return records.map(r => ({
        id: r.id,
        clinicId: r.clinicId,
        staffId: r.staffId,
        type: r.type,
        data: r.data,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        staffName: r.staff?.user?.name || 'Unknown',
        staffRole: r.staff?.role || '—',
        staffDepartment: r.staff?.department || '—'
    }));
};
export const createStaffDocumentRecord = async (clinicId, payload) => {
    const staffId = Number(payload.staffId);
    const documentType = payload.documentType?.trim?.() || payload.documentType;
    const fileName = payload.fileName;
    const notes = payload.notes;
    const fileData = payload.fileData;
    if (!staffId || isNaN(staffId))
        throw new AppError('Valid staff ID is required', 400);
    const staff = await prisma.clinicstaff.findFirst({ where: { id: staffId, clinicId } });
    if (!staff)
        throw new AppError('Staff not found or does not belong to this clinic', 404);
    try {
        const record = await prisma.staff_document.create({
            data: {
                clinicId,
                staffId,
                type: documentType,
                data: JSON.stringify({
                    fileName: fileName || null,
                    notes: notes || null,
                    fileData: fileData || null
                })
            },
            include: {
                staff: { select: { id: true, user: { select: { name: true } } } }
            }
        });
        return {
            ...record,
            staffName: record.staff?.user?.name || 'Unknown'
        };
    }
    catch (err) {
        if (err?.code === 'P2021' || err?.message?.includes('does not exist') || err?.message?.includes("reading 'create'")) {
            throw new AppError('Staff documents setup required. In backend folder run: npx prisma generate && npx prisma migrate deploy (or npx prisma db push), then restart the server.', 503);
        }
        throw err;
    }
};
