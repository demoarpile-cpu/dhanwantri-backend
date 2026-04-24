import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.js';
import * as departmentService from '../services/department.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getDepartments = asyncHandler(async (req: AuthRequest, res: Response) => {
    const departments = await departmentService.getDepartments(Number(req.clinicId));
    res.status(200).json({ status: 'success', data: departments });
});

export const createDepartment = asyncHandler(async (req: AuthRequest, res: Response) => {
    const department = await departmentService.createDepartment(Number(req.clinicId), req.body);
    res.status(201).json({ status: 'success', data: department });
});

export const deleteDepartment = asyncHandler(async (req: AuthRequest, res: Response) => {
    await departmentService.deleteDepartment(Number(req.params.id));
    res.status(200).json({ status: 'success', data: null });
});

export const updateNotificationStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
    const notification = await departmentService.updateNotificationStatus(Number(req.params.id), req.body.status);
    res.status(200).json({ status: 'success', data: notification });
});

export const getNotifications = asyncHandler(async (req: AuthRequest, res: Response) => {
    const notifications = await departmentService.getNotifications(Number(req.clinicId));
    res.status(200).json({ status: 'success', data: notifications });
});

export const getUnreadCount = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.clinicId) {
        return res.status(200).json({ status: 'success', data: { count: 0 } });
    }
    const department = req.query.department ? String(req.query.department) : undefined;
    const count = await departmentService.getUnreadNotificationsCount(Number(req.clinicId), department);
    res.status(200).json({ status: 'success', data: { count } });
});
