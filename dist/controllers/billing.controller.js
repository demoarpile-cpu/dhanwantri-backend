import * as billingService from '../services/billing.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
export const getAccountingDashboardStats = asyncHandler(async (req, res) => {
    const stats = await billingService.getAccountingDashboardStats(req.clinicId);
    res.status(200).json({ status: 'success', data: stats });
});
export const getInvoices = asyncHandler(async (req, res) => {
    const invoices = await billingService.getInvoices(req.clinicId);
    res.status(200).json({ status: 'success', data: invoices });
});
export const createInvoice = asyncHandler(async (req, res) => {
    const invoice = await billingService.createInvoice(req.clinicId, req.body);
    res.status(201).json({ status: 'success', data: invoice });
});
export const updateInvoice = asyncHandler(async (req, res) => {
    const invoice = await billingService.updateInvoiceStatus(req.clinicId, req.params.id, req.body.status, req.body.paymentMethod);
    res.status(200).json({ status: 'success', data: invoice });
});
export const getPendingItems = asyncHandler(async (req, res) => {
    const items = await billingService.getPendingBillingItems(req.clinicId, Number(req.params.patientId));
    res.status(200).json({ status: 'success', data: items });
});
export const getCorporatePharmacySummary = asyncHandler(async (req, res) => {
    const summary = await billingService.getCorporatePharmacySummary(req.clinicId, String(req.query.month || ''));
    res.status(200).json({ status: 'success', data: summary });
});
