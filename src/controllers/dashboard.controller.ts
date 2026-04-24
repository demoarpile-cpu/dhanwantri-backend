import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.js';
import * as dashboardService from '../services/dashboard.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getStats = asyncHandler(async (req: AuthRequest, res: Response) => {
    const role = (req.query.role as string) || (req.user?.role as string);
    const clinicId = req.clinicId || (req.user as any)?.clinicId;
    const userId = req.user?.id;

    const stats = await dashboardService.getDashboardStats(role, clinicId, userId);
    res.status(200).json({ success: true, data: stats });
});
