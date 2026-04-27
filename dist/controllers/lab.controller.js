import * as labService from '../services/lab.service.js';
export const getOrders = async (req, res, next) => {
    try {
        const clinicId = req.clinicId;
        const type = req.query.type || 'LAB';
        const status = req.query.status;
        const orders = await labService.getLabOrders(clinicId, type, status);
        res.json({ status: 'success', data: orders });
    }
    catch (error) {
        next(error);
    }
};
export const completeOrder = async (req, res, next) => {
    try {
        const clinicId = req.clinicId;
        const { orderId, result, price, paid } = req.body;
        const data = await labService.completeLabOrder(clinicId, orderId, { result, price, paid });
        res.json({ status: 'success', data });
    }
    catch (error) {
        next(error);
    }
};
export const rejectOrder = async (req, res, next) => {
    try {
        const clinicId = req.clinicId;
        const { orderId } = req.body;
        const data = await labService.rejectLabOrder(clinicId, orderId);
        res.json({ status: 'success', data });
    }
    catch (error) {
        next(error);
    }
};
export const collectSample = async (req, res, next) => {
    try {
        const clinicId = req.clinicId;
        const { orderId } = req.body;
        const data = await labService.collectSample(clinicId, orderId);
        res.json({ status: 'success', data, message: 'Sample marked as collected' });
    }
    catch (error) {
        next(error);
    }
};
