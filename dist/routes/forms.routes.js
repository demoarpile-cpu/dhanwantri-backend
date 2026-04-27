import { Router } from 'express';
import * as formController from '../controllers/forms.controller.js';
import { protect, restrictTo, ensureClinicContext } from '../middlewares/auth.js';
const router = Router();
// Base protection
router.use(protect, ensureClinicContext);
// Templates (Admin Only)
router.get('/templates', restrictTo('ADMIN', 'DOCTOR', 'RECEPTIONIST'), formController.getTemplates); // Doctors/Receptionists can view options
router.get('/templates/:id', restrictTo('ADMIN', 'DOCTOR', 'RECEPTIONIST'), formController.getTemplateById);
router.post('/templates', restrictTo('ADMIN'), formController.createTemplate);
router.patch('/templates/:id', restrictTo('ADMIN'), formController.updateTemplate);
router.delete('/templates/:id', restrictTo('ADMIN'), formController.deleteTemplate);
// Form Responses (Doctors)
router.get('/responses', restrictTo('DOCTOR', 'ADMIN'), formController.getAllResponses);
router.post('/responses', restrictTo('DOCTOR'), formController.submitResponse);
router.get('/responses/:id', restrictTo('DOCTOR', 'ADMIN'), formController.getResponseById);
router.get('/patient/:patientId/responses', restrictTo('DOCTOR', 'ADMIN'), formController.getPatientResponses);
export default router;
