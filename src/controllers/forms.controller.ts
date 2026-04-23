import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.js';
import * as formService from '../services/form.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { prisma } from '../lib/prisma.js';

const resolveDoctorId = async (userId: number, clinicId: number) => {
    const staff = await prisma.clinicstaff.findFirst({
        where: { userId, clinicId }
    });
    return staff?.id || userId;
};


// Templates
export const getTemplates = asyncHandler(async (req: AuthRequest, res: Response) => {
    const templates = await formService.getTemplates(req.clinicId!);
    res.status(200).json({ success: true, data: templates });
});

export const getTemplateById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const template = await formService.getTemplateById(req.clinicId!, Number(req.params.id));
    res.status(200).json({ success: true, data: template });
});

export const createTemplate = asyncHandler(async (req: AuthRequest, res: Response) => {
    const template = await formService.createTemplate(req.clinicId!, req.body, req.user!.id);
    res.status(201).json({ success: true, message: 'Form created successfully', data: template });
});

export const updateTemplate = asyncHandler(async (req: AuthRequest, res: Response) => {
    const template = await formService.updateTemplate(req.clinicId!, Number(req.params.id), req.body, req.user!.id);
    res.status(200).json({ success: true, message: 'Form updated successfully', data: template });
});

export const deleteTemplate = asyncHandler(async (req: AuthRequest, res: Response) => {
    await formService.deleteTemplate(req.clinicId!, Number(req.params.id), req.user!.id);
    res.status(200).json({ success: true, message: 'Form deleted successfully' });
});

// Responses
export const getAllResponses = asyncHandler(async (req: AuthRequest, res: Response) => {
    const responses = await formService.getAllResponses(req.clinicId!);
    res.status(200).json({ success: true, data: responses });
});

export const submitResponse = asyncHandler(async (req: AuthRequest, res: Response) => {
    const doctorId = await resolveDoctorId(req.user!.id, req.clinicId!);
    const response = await formService.submitResponse(req.clinicId!, doctorId, req.body);
    res.status(201).json({ success: true, message: 'Assessment submitted successfully', data: response });
});


export const getPatientResponses = asyncHandler(async (req: AuthRequest, res: Response) => {
    const responses = await formService.getPatientResponses(req.clinicId!, Number(req.params.patientId));
    res.status(200).json({ success: true, data: responses });
});

export const getResponseById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const response = await formService.getResponseById(req.clinicId!, Number(req.params.id));
    res.status(200).json({ success: true, data: response });
});
