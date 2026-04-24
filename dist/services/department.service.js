import { prisma } from '../lib/prisma.js';
export const getDepartments = async (clinicId) => {
    return await prisma.department.findMany({
        where: { clinicId },
        orderBy: { name: 'asc' }
    });
};
export const createDepartment = async (clinicId, data) => {
    return await prisma.department.create({
        data: {
            ...data,
            clinicId
        }
    });
};
export const deleteDepartment = async (id) => {
    return await prisma.department.delete({
        where: { id }
    });
};
export const updateNotificationStatus = async (id, status) => {
    const notification = await prisma.notification.update({
        where: { id },
        data: { status }
    });
    // If marked as completed, try to update the linked Service Order
    if (status === 'completed' && notification.message) {
        try {
            const msg = typeof notification.message === 'string' ? JSON.parse(notification.message) : notification.message;
            if (msg.orderId) {
                await prisma.service_order.update({
                    where: { id: Number(msg.orderId) },
                    data: { testStatus: 'Completed' }
                });
            }
        }
        catch (e) {
            console.error('Failed to update linked service order:', e);
        }
    }
    return notification;
};
export const getNotifications = async (clinicId) => {
    return await prisma.notification.findMany({
        where: { clinicId },
        orderBy: { createdAt: 'desc' }
    });
};
export const getUnreadNotificationsCount = async (clinicId, department) => {
    const where = {
        clinicId,
        status: 'unread'
    };
    if (department) {
        where.department = {
            contains: department,
            // mode: 'insensitive' // Optional, based on DB support
        };
    }
    return await prisma.notification.count({ where });
};
