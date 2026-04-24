import { Router } from 'express';
import * as receptionController from '../controllers/reception.controller.js';
import { protect, restrictTo, ensureClinicContext } from '../middlewares/auth.js';

const router = Router();

router.use(protect, ensureClinicContext);

router.get('/stats', restrictTo('RECEPTIONIST', 'ADMIN'), receptionController.getStats);
router.get('/activities', restrictTo('RECEPTIONIST', 'ADMIN'), receptionController.getActivities);

router.get('/patients', restrictTo('RECEPTIONIST', 'ADMIN', 'DOCUMENT_CONTROLLER', 'PHARMACY', 'ACCOUNTING', 'ACCOUNTS', 'ACCOUNTANT'), receptionController.getPatients);
router.post('/patients', restrictTo('RECEPTIONIST', 'ADMIN'), receptionController.createPatient);
router.patch('/patients/:id', restrictTo('RECEPTIONIST', 'ADMIN', 'DOCTOR', 'PHARMACY', 'LAB', 'RADIOLOGY'), receptionController.updatePatient);

router.get('/appointments', receptionController.getAppointments);
router.get('/patients/:patientId/appointments', receptionController.getPatientAppointments);
router.post('/appointments', restrictTo('RECEPTIONIST', 'ADMIN'), receptionController.createAppointment);

router.patch('/appointments/:id/status', restrictTo('RECEPTIONIST', 'ADMIN'), receptionController.updateApptStatus);
router.post('/appointments/:id/check-in', restrictTo('RECEPTIONIST', 'ADMIN'), receptionController.checkIn);

router.patch('/patients/:id/password', restrictTo('RECEPTIONIST', 'ADMIN'), receptionController.resetPassword);

export default router;
