import { medicalReportService } from '../services/medicalReport.service.js';
export const medicalReportController = {
    async getTemplates(req, res) {
        try {
            const clinicId = req.clinicId;
            const templates = await medicalReportService.getTemplates(clinicId);
            res.json({ success: true, data: templates });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
    async createReport(req, res) {
        try {
            const data = {
                ...req.body,
                clinicId: req.clinicId,
                doctorId: req.user.id
            };
            const report = await medicalReportService.createReport(data);
            res.status(201).json({ success: true, data: report });
        }
        catch (error) {
            console.error('Error creating medical report:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },
    async getReportById(req, res) {
        try {
            const report = await medicalReportService.getReportById(Number(req.params.id));
            if (!report) {
                return res.status(404).json({ success: false, message: 'Report not found' });
            }
            res.json({ success: true, data: report });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
    async getReports(req, res) {
        try {
            const clinicId = req.clinicId;
            const userId = req.user.id;
            const role = req.user.role;
            let reports;
            if (role === 'DOCTOR') {
                reports = await medicalReportService.getReportsByDoctor(userId, clinicId);
            }
            else if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
                reports = await medicalReportService.getReportsByClinic(clinicId);
            }
            else if (role === 'PATIENT') {
                const email = req.user.email;
                reports = await medicalReportService.getReportsByPatientEmail(email);
            }
            else {
                return res.status(403).json({ success: false, message: 'Unauthorized' });
            }
            res.json({ success: true, data: reports });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
    async updateReport(req, res) {
        try {
            const reportId = Number(req.params.id);
            const userId = req.user.id;
            const role = req.user.role;
            const existingReport = await medicalReportService.getReportById(reportId);
            if (!existingReport) {
                return res.status(404).json({ success: false, message: 'Report not found' });
            }
            if (role !== 'DOCTOR' || existingReport.doctorId !== userId) {
                return res.status(403).json({ success: false, message: 'Only the creating doctor can edit the report' });
            }
            const updatedReport = await medicalReportService.updateReport(reportId, req.body);
            res.json({ success: true, data: updatedReport });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
};
