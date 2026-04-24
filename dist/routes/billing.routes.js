import { Router } from 'express';
import * as billingController from '../controllers/billing.controller.js';
import { protect, restrictTo, ensureClinicContext } from '../middlewares/auth.js';
const router = Router();
router.use(protect, ensureClinicContext);
// Common Read Access (Handled by ensureClinicContext)
router.get('/invoices', billingController.getInvoices);
router.get('/dashboard-stats', billingController.getAccountingDashboardStats);
// Restricted Write Actions
router.use(restrictTo('RECEPTIONIST', 'ADMIN', 'ACCOUNTANT', 'ACCOUNTING'));
router.post('/', billingController.createInvoice);
router.patch('/invoices/:id', billingController.updateInvoice);
router.get('/pending/:patientId', billingController.getPendingItems);
router.get('/corporate-pharmacy-summary', billingController.getCorporatePharmacySummary);
export default router;
