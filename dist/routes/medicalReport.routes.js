import { Router } from 'express';
import { medicalReportController } from '../controllers/medicalReport.controller.js';
import { protect, restrictTo, ensureClinicContext } from '../middlewares/auth.js';
const router = Router();
// All routes require authentication and clinic context
router.use(protect, ensureClinicContext);
// GET /api/medical-reports/templates - List templates
router.get('/templates', medicalReportController.getTemplates);
// GET /api/medical-reports - List reports based on role
router.get('/', medicalReportController.getReports);
// GET /api/medical-reports/:id - Get details of a single report
router.get('/:id', medicalReportController.getReportById);
// POST /api/medical-reports - Create a new report (Doctor only)
router.post('/', restrictTo('DOCTOR'), medicalReportController.createReport);
// PATCH /api/medical-reports/:id - Edit an existing report (Doctor only)
router.patch('/:id', restrictTo('DOCTOR'), medicalReportController.updateReport);
export default router;
