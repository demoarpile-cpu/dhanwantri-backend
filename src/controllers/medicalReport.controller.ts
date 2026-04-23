import { Request, Response } from 'express';
import { medicalReportService } from '../services/medicalReport.service.js';

export const medicalReportController = {
    async getTemplates(req: Request, res: Response) {
        try {
            const clinicId = (req as any).clinicId;
            const templates = await medicalReportService.getTemplates(clinicId);
            res.json({ success: true, data: templates });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    async createReport(req: Request, res: Response) {
        try {
            const data = {
                ...req.body,
                clinicId: (req as any).clinicId,
                doctorId: (req as any).user.id
            };
            const report = await medicalReportService.createReport(data);
            res.status(201).json({ success: true, data: report });
        } catch (error: any) {
            console.error('Error creating medical report:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    async getReportById(req: Request, res: Response) {
        try {
            const report = await medicalReportService.getReportById(Number(req.params.id));
            if (!report) {
                return res.status(404).json({ success: false, message: 'Report not found' });
            }
            res.json({ success: true, data: report });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    async getReports(req: Request, res: Response) {
        try {
            const clinicId = (req as any).clinicId;
            const userId = (req as any).user.id;
            const role = (req as any).user.role;

            let reports;
            if (role === 'DOCTOR') {
                reports = await medicalReportService.getReportsByDoctor(userId, clinicId);
            } else if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
                reports = await medicalReportService.getReportsByClinic(clinicId);
            } else if (role === 'PATIENT') {
                const email = (req as any).user.email;
                reports = await medicalReportService.getReportsByPatientEmail(email);
            } else {
                return res.status(403).json({ success: false, message: 'Unauthorized' });
            }

            res.json({ success: true, data: reports });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    async updateReport(req: Request, res: Response) {
        try {
            const reportId = Number(req.params.id);
            const userId = (req as any).user.id;
            const role = (req as any).user.role;

            const existingReport = await medicalReportService.getReportById(reportId);
            if (!existingReport) {
                return res.status(404).json({ success: false, message: 'Report not found' });
            }

            if (role !== 'DOCTOR' || existingReport.doctorId !== userId) {
                return res.status(403).json({ success: false, message: 'Only the creating doctor can edit the report' });
            }

            const updatedReport = await medicalReportService.updateReport(reportId, req.body);
            res.json({ success: true, data: updatedReport });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
};
