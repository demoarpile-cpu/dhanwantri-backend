import { Request, Response } from 'express';
import * as documentService from '../services/document.controller.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getRecords = asyncHandler(async (req: Request, res: Response) => {
    const clinicId = (req as any).clinicId;
    const patientId = req.query.patientId ? Number(req.query.patientId) : undefined;
    const records = await documentService.getDocumentRecords(clinicId, { patientId });
    res.status(200).json({ status: 'success', data: records });
});

export const getStaffRecords = asyncHandler(async (req: Request, res: Response) => {
    const clinicId = (req as any).clinicId;
    const records = await documentService.getStaffDocumentRecords(clinicId);
    res.status(200).json({ status: 'success', data: records });
});

export const getStats = asyncHandler(async (req: Request, res: Response) => {
    const clinicId = (req as any).clinicId;
    const stats = await documentService.getDocumentStats(clinicId);
    res.status(200).json({ status: 'success', data: stats });
});

export const createRecord = asyncHandler(async (req: Request, res: Response) => {
    const clinicId = (req as any).clinicId;
    const userId = (req as any).user.id;
    const record = await documentService.createDocumentRecord(clinicId, userId, req.body);
    res.status(201).json({ status: 'success', data: record });
});

export const createStaffRecord = asyncHandler(async (req: Request, res: Response) => {
    const clinicId = (req as any).clinicId;
    const record = await documentService.createStaffDocumentRecord(clinicId, req.body);
    res.status(201).json({ status: 'success', data: record });
});
