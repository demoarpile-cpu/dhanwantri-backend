import { Router } from 'express';
import * as pharmacyController from '../controllers/pharmacy.controller.js';
import { protect, ensureClinicContext, requireModule } from '../middlewares/auth.js';

const router = Router();

router.use(protect);
router.use(ensureClinicContext);
router.use(requireModule('pharmacy'));

router.get('/inventory', pharmacyController.getInventory);
router.get('/inventory/low-stock', pharmacyController.getLowStock);
router.post('/inventory', pharmacyController.addInventory);
router.patch('/inventory/:id', pharmacyController.updateInventory);
router.delete('/inventory/:id', pharmacyController.deleteInventory);
router.get('/orders', pharmacyController.getOrders);
router.post('/orders/process', pharmacyController.processOrder);
router.get('/pos', pharmacyController.getPosSales);
router.post('/pos', pharmacyController.directSale);
router.patch('/pos/:id', pharmacyController.updatePosSale);
router.delete('/pos/:id', pharmacyController.deletePosSale);
router.get('/notifications', pharmacyController.getNotifications);
router.get('/reports', pharmacyController.getReports);

export default router;
