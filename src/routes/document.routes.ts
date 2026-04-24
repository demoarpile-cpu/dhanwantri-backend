import { Router } from 'express';
import * as documentController from '../controllers/document.controller.js';
import { protect, restrictTo, ensureClinicContext } from '../middlewares/auth.js';

const router = Router();

router.use(protect, ensureClinicContext, restrictTo('DOCUMENT_CONTROLLER', 'ADMIN', 'SUPER_ADMIN'));

router.get('/records', documentController.getRecords);
router.get('/staff-records', documentController.getStaffRecords);
router.get('/stats', documentController.getStats);
router.post('/records', documentController.createRecord);
router.post('/staff-records', documentController.createStaffRecord);

export default router;
