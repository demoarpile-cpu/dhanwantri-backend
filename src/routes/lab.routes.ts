import { Router } from 'express';
import * as labController from '../controllers/lab.controller.js';
import { protect, ensureClinicContext } from '../middlewares/auth.js';

const router = Router();

router.use(protect);
router.use(ensureClinicContext);

router.get('/orders', labController.getOrders);
router.post('/orders/complete', labController.completeOrder);
router.post('/orders/reject', labController.rejectOrder);
router.post('/orders/collect-sample', labController.collectSample);

export default router;
