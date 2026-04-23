import { prisma } from '../lib/prisma.js';

export const getDepartments = async (clinicId: number) => {
    return await prisma.department.findMany({
        where: { clinicId },
        orderBy: { name: 'asc' }
    });
};

export const createDepartment = async (clinicId: number, data: { name: string, type?: string }) => {
    return await prisma.department.create({
        data: {
            ...data,
            clinicId
        }
    });
};

export const deleteDepartment = async (id: number) => {
    return await prisma.department.delete({
        where: { id }
    });
};

export const updateNotificationStatus = async (id: number, status: string) => {
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
        } catch (e) {
            console.error('Failed to update linked service order:', e);
        }
    }

    return notification;
};

export const getNotifications = async (clinicId: number) => {
    return await prisma.notification.findMany({
        where: { clinicId },
        orderBy: { createdAt: 'desc' }
    });
};

export const getUnreadNotificationsCount = async (clinicId: number, department?: string) => {
    const where: any = {
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
