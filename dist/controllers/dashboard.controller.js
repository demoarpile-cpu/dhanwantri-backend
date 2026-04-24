import * as dashboardService from '../services/dashboard.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
export const getStats = asyncHandler(async (req, res) => {
    const role = req.query.role || req.user?.role;
    const clinicId = req.clinicId || req.user?.clinicId;
    const userId = req.user?.id;
    const stats = await dashboardService.getDashboardStats(role, clinicId, userId);
    res.status(200).json({ success: true, data: stats });
});
