import { Router } from 'express';
import * as publicController from '../controllers/public.controller.js';
import * as saasController from '../controllers/saas.controller.js';

const router = Router();

// Publicly accessible routes
router.get('/clinic/:subdomain', publicController.getClinicDetails);
router.get('/clinic/:clinicId/doctors', publicController.getClinicDoctors);
router.get('/doctor/:doctorId/availability', publicController.getDoctorAvailability);
router.post('/book', publicController.createBooking);
router.get('/clinic/:subdomain/live-tokens', publicController.getTokens);

// SaaS endpoints
router.get('/plans', saasController.getPlans);
router.post('/register', saasController.createRegistration);

export default router;
