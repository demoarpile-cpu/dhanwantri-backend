import { Router } from 'express';
import * as doctorController from '../controllers/doctor.controller.js';
import { protect, restrictTo, ensureClinicContext } from '../middlewares/auth.js';

const router = Router();

router.use(protect, ensureClinicContext);

// Data viewing endpoints (Shared with Admin/Document Controller/Receptionist)
router.get('/assessments', restrictTo('DOCTOR', 'ADMIN', 'DOCUMENT_CONTROLLER', 'RECEPTIONIST'), doctorController.getAllAssessments);
router.get('/history/:patientId', restrictTo('DOCTOR', 'ADMIN', 'DOCUMENT_CONTROLLER', 'RECEPTIONIST'), doctorController.getHistory);
router.get('/patients/:patientId/profile', restrictTo('DOCTOR', 'ADMIN', 'DOCUMENT_CONTROLLER', 'RECEPTIONIST'), doctorController.getPatientProfile);
router.get('/templates', restrictTo('DOCTOR', 'ADMIN', 'DOCUMENT_CONTROLLER', 'RECEPTIONIST'), doctorController.getTemplates);
router.get('/templates/:id', restrictTo('DOCTOR', 'ADMIN', 'DOCUMENT_CONTROLLER', 'RECEPTIONIST'), doctorController.getTemplateById);
router.get('/patients', restrictTo('DOCTOR', 'ADMIN', 'DOCUMENT_CONTROLLER', 'RECEPTIONIST'), doctorController.getPatients);

// Doctor only actions
router.use(restrictTo('DOCTOR'));

router.get('/stats', doctorController.getStats);
router.get('/activities', doctorController.getActivities);
router.get('/queue', doctorController.getQueue);
router.post('/assessments', doctorController.createAssessment);
router.post('/orders', doctorController.createOrder);
router.get('/orders', doctorController.getOrders);
router.get('/prescription-inventory', doctorController.getPrescriptionInventory);
router.get('/revenue', doctorController.getRevenue);

export default router;
