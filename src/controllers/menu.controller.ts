import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.js';
import * as menuService from '../services/menu.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getMenu = asyncHandler(async (req: AuthRequest, res: Response) => {
    const role = (req.params.role as string) || (req.user?.role as string);
    const menu = await menuService.getMenuByRole(role);
    res.status(200).json({ success: true, data: menu });
});
