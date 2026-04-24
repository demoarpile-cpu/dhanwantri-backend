import { prisma } from '../lib/prisma.js';
import { AppError } from '../utils/AppError.js';
export const getLabOrders = async (clinicId, type, statusFilter) => {
    console.log(`[LAB/RAD] Fetching ${type} orders for clinic ${clinicId} | Status: ${statusFilter || 'all'}`);
    const typeList = type === 'LAB' ? ['LAB', 'Laboratory', 'laboratory'] : ['RADIOLOGY', 'Radiology', 'radiology', 'RAD'];
    const where = {
        clinicId,
        type: { in: typeList }
    };
    if (statusFilter) {
        where.testStatus = statusFilter;
    }
    return await prisma.service_order.findMany({
        where,
        include: {
            patient: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' }
    });
};
export const updateLabStatus = async (clinicId, orderId, status, resultData) => {
    // 1. Fetch current order to check payment status
    const order = await prisma.service_order.findUnique({
        where: { id: orderId, clinicId }
    });
    if (!order)
        throw new AppError('Order not found', 404);
    // 2. Dependency Rule: Cannot move from Pending if unpaid
    if (order.testStatus === 'Pending' && status !== 'Rejected' && order.paymentStatus !== 'Paid') {
        throw new AppError('Payment required before starting this service.', 400);
    }
    // Status Flow: Pending -> Sample Collected -> Completed
    const data = { testStatus: status };
    if (resultData) {
        data.result = resultData;
    }
    return await prisma.service_order.update({
        where: { id: orderId, clinicId },
        data
    });
};
export const rejectLabOrder = async (clinicId, orderId) => {
    return await prisma.service_order.update({
        where: { id: orderId, clinicId },
        data: { testStatus: 'Rejected' }
    });
};
export const collectSample = async (clinicId, orderId) => {
    const order = await prisma.service_order.findUnique({
        where: { id: orderId, clinicId }
    });
    if (!order)
        throw new AppError('Order not found', 404);
    if (order.paymentStatus !== 'Paid')
        throw new AppError('Payment required before collection', 400);
    return await updateLabStatus(clinicId, orderId, 'Sample Collected');
};
export const uploadReport = async (clinicId, orderId, reportContent) => {
    const order = await prisma.service_order.findUnique({
        where: { id: orderId, clinicId }
    });
    if (!order)
        throw new AppError('Order not found', 404);
    if (order.testStatus !== 'Sample Collected')
        throw new AppError('Sample must be collected before uploading result', 400);
    return await updateLabStatus(clinicId, orderId, 'Completed', reportContent);
};
export const publishReport = async (clinicId, orderId) => {
    return await updateLabStatus(clinicId, orderId, 'Completed');
};
export const completeLabOrder = async (clinicId, orderId, data) => {
    const order = await prisma.service_order.findUnique({
        where: { id: orderId, clinicId }
    });
    if (!order)
        throw new AppError('Order not found', 404);
    // We maintain backward compatibility but enforce the new status name 'Completed'
    const updateData = { testStatus: 'Completed' };
    if (data.result) {
        updateData.result = data.result;
    }
    // Payment/Price updates are now ignored in the technical flow to preserve Billing integrity
    return await prisma.service_order.update({
        where: { id: orderId, clinicId },
        data: updateData
    });
};
