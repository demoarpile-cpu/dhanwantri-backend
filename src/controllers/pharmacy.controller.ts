import { Request, Response, NextFunction } from 'express';
import * as pharmacyService from '../services/pharmacy.service.js';

export const getInventory = async (req: any, res: Response, next: NextFunction) => {
    try {
        const clinicId = req.clinicId;
        const inventory = await pharmacyService.getInventory(clinicId);
        res.json({ status: 'success', data: inventory });
    } catch (error) {
        next(error);
    }
};

export const getLowStock = async (req: any, res: Response, next: NextFunction) => {
    try {
        const clinicId = req.clinicId;
        const threshold = req.query.threshold ? Number(req.query.threshold) : 10;
        const items = await pharmacyService.getLowStockInventory(clinicId, threshold);
        res.json({ status: 'success', data: items });
    } catch (error) {
        next(error);
    }
};

export const addInventory = async (req: any, res: Response, next: NextFunction) => {
    try {
        const clinicId = req.clinicId;
        const item = await pharmacyService.addInventory(clinicId, req.body);
        res.status(201).json({ status: 'success', data: item });
    } catch (error) {
        next(error);
    }
};

export const updateInventory = async (req: any, res: Response, next: NextFunction) => {
    try {
        const clinicId = req.clinicId;
        const id = Number(req.params.id);
        const item = await pharmacyService.updateInventory(clinicId, id, req.body);
        res.json({ status: 'success', data: item });
    } catch (error) {
        next(error);
    }
};

export const deleteInventory = async (req: any, res: Response, next: NextFunction) => {
    try {
        const clinicId = req.clinicId;
        const id = Number(req.params.id);
        await pharmacyService.deleteInventory(clinicId, id);
        res.json({ status: 'success', message: 'Item deleted' });
    } catch (error) {
        next(error);
    }
};

export const getOrders = async (req: any, res: Response, next: NextFunction) => {
    try {
        const clinicId = req.clinicId;
        const orders = await pharmacyService.getPharmacyOrders(clinicId);
        res.json({ status: 'success', data: orders });
    } catch (error) {
        next(error);
    }
};

export const processOrder = async (req: any, res: Response, next: NextFunction) => {
    try {
        const clinicId = req.clinicId;
        const { orderId, items, paid, amount, source } = req.body;
        const result = await pharmacyService.processPharmacyOrder(clinicId, orderId, items, paid, amount, source);
        res.json({ status: 'success', data: result });
    } catch (error) {
        next(error);
    }
};
export const directSale = async (req: any, res: Response, next: NextFunction) => {
    try {
        const clinicId = req.clinicId;
        const result = await pharmacyService.directSale(clinicId, req.body);
        res.status(201).json({ status: 'success', data: result });
    } catch (error) {
        next(error);
    }
};

export const getPosSales = async (req: any, res: Response, next: NextFunction) => {
    try {
        const clinicId = req.clinicId;
        const sales = await pharmacyService.getPosSales(clinicId);
        res.json({ status: 'success', data: sales });
    } catch (error) {
        next(error);
    }
};

export const updatePosSale = async (req: any, res: Response, next: NextFunction) => {
    try {
        const clinicId = req.clinicId;
        const invoiceId = req.params.id;
        const result = await pharmacyService.updatePosSale(clinicId, invoiceId, req.body);
        res.json({ status: 'success', data: result });
    } catch (error) {
        next(error);
    }
};

export const deletePosSale = async (req: any, res: Response, next: NextFunction) => {
    try {
        const clinicId = req.clinicId;
        const invoiceId = req.params.id;
        await pharmacyService.deletePosSale(clinicId, invoiceId);
        res.json({ status: 'success', message: 'Sale deleted' });
    } catch (error) {
        next(error);
    }
};

export const getNotifications = async (req: any, res: Response, next: NextFunction) => {
    try {
        const clinicId = req.clinicId;
        const count = await pharmacyService.getPharmacyNotificationsCount(clinicId);
        res.json({ status: 'success', data: { count } });
    } catch (error) {
        next(error);
    }
};

export const getReports = async (req: any, res: Response, next: NextFunction) => {
    try {
        const clinicId = req.clinicId;
        const date = req.query.date ? String(req.query.date) : new Date().toISOString().split('T')[0];
        const reports = await pharmacyService.getDailySalesReports(clinicId, date);
        res.json({ status: 'success', data: reports });
    } catch (error) {
        next(error);
    }
};
