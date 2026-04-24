import { Router } from 'express';
import * as clinicController from '../controllers/clinic.controller.js';
import { protect, restrictToClinicRole, ensureClinicContext } from '../middlewares/auth.js';

const router = Router();

// Base protection for all routes
router.use(protect, ensureClinicContext);

// Routes accessible by ADMIN and RECEPTIONIST
// Routes accessible by all clinic roles (Read-only)
router.get('/details', clinicController.getClinicData);
router.patch('/details', restrictToClinicRole('ADMIN'), clinicController.updateClinicData);
router.get('/staff', clinicController.getClinicStaff);
router.get('/booking-config', clinicController.getBookingConfig);
router.get('/booking-config/doctor/:doctorId', clinicController.getDoctorAvailability);
router.get('/services', clinicController.getClinicServices);

// Admin-only routes
router.use(restrictToClinicRole('ADMIN'));

router.get('/stats', clinicController.getClinicStats);
router.get('/activities', clinicController.getActivities);
router.post('/staff', clinicController.createStaff);
router.patch('/staff/:id', clinicController.updateStaff);
router.delete('/staff/:id', clinicController.deleteStaff);
router.put('/users/:id/reset-password', clinicController.resetPassword);

// Form Templates
router.get('/templates', clinicController.getFormTemplates); // Admin manages templates
router.post('/templates', clinicController.createFormTemplate);
router.delete('/templates/:id', clinicController.deleteFormTemplate);

// Booking Config Update (Read is above)
router.post('/booking-config', clinicController.updateBookingConfig);

// Services CRUD
router.post('/services', clinicController.createClinicService);
router.put('/services/:id', clinicController.updateClinicService);
router.delete('/services/:id', clinicController.deleteClinicService);

export default router;
