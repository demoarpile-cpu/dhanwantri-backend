import * as menuService from '../services/menu.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
export const getMenu = asyncHandler(async (req, res) => {
    const role = req.params.role || req.user?.role;
    const menu = await menuService.getMenuByRole(role);
    res.status(200).json({ success: true, data: menu });
});
