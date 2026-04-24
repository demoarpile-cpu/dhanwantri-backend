import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError.js';
import { prisma } from '../lib/prisma.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOG_PATH = path.join(__dirname, '../../login-debug.log');

export interface AuthRequest extends Request {
    user?: {
        id: number;
        email: string;
        clinicId?: number;
        role?: string;
    };
    clinicId?: number;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return next(new AppError('You are not logged in! Please log in to get access.', 401));
        }

        const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'secret');

        // Otherwise check real database
        const currentUser = await prisma.user.findUnique({
            where: { id: decoded.id }
        });

        if (!currentUser) {
            return next(new AppError('The user belonging to this token no longer exists.', 401));
        }

        req.user = {
            id: currentUser.id,
            email: currentUser.email,
            clinicId: decoded.clinicId,
            role: decoded.role || currentUser.role // Use role from token if available, otherwise fallback to database
        };

        const accessLog = `[${new Date().toISOString()}] ACCESS: ${req.user.email} | URL: ${req.url} | DbRole: ${currentUser.role} | TokenRole: ${decoded.role}\n`;
        fs.appendFileSync(LOG_PATH, accessLog);

        next();
    } catch (error) {
        next(new AppError('Invalid token. Please log in again.', 401));
    }
};

export const restrictTo = (...roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role || '')) {
            console.log(`[403 ERROR] Denied: User ${req.user?.email} | Role: ${req.user?.role} | Expected: ${roles.join(',')}`);
            return next(new AppError('You do not have permission to perform this action', 403));
        }
        next();
    };
};

export const restrictToClinicRole = (...roles: string[]) => {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            // Super admins bypass clinic role checks
            if (req.user?.role === 'SUPER_ADMIN') {
                return next();
            }

            if (!req.user || !req.clinicId) {
                return next(new AppError('No clinic context found. Please select a clinic.', 400));
            }

            // Look up the user's role in the clinicstaff table for this clinic
            const staffRecord = await prisma.clinicstaff.findFirst({
                where: {
                    userId: req.user.id,
                    clinicId: req.clinicId
                }
            });

            if (!staffRecord) {
                console.log(`[403 ERROR] Denied: User ${req.user?.email} | No staff record found for clinic ${req.clinicId} (UserRole: ${req.user.role})`);
                return next(new AppError('You do not have permission to perform this action', 403));
            }

            let userRoles: string[] = [];
            try {
                userRoles = staffRecord.roles ? JSON.parse(staffRecord.roles) : [staffRecord.role];
            } catch (e) {
                userRoles = [staffRecord.role];
            }

            const hasPermission = roles.some(role => userRoles.includes(role));

            if (!hasPermission) {
                console.log(`[403 ERROR] Denied: User ${req.user?.email} | Clinic Roles: ${userRoles.join(', ')} | Expected: ${roles.join(',')}`);
                return next(new AppError('You do not have permission to perform this action', 403));
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

export const ensureClinicContext = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        // Priority order for determining clinic context:
        // 1. Explicit clinicId in the token (Session context)
        // 2. Fallback: Request Header (Explicit context selection)

        let clinicId = req.user?.clinicId;
        const headerId = req.headers['x-clinic-id'] ? Number(req.headers['x-clinic-id']) : undefined;

        // If user is Super Admin, they can access any clinic passed in the header
        if (req.user?.role === 'SUPER_ADMIN') {
            req.clinicId = clinicId || headerId;
            return next();
        }

        if (!clinicId && headerId) {
            // Check if user belongs to this clinic
            const membership = await prisma.clinicstaff.findFirst({
                where: {
                    userId: req.user!.id,
                    clinicId: headerId
                }
            });

            if (!membership) {
                console.warn(`[SECURITY] Unauthorized clinic access attempt by ${req.user?.email} for clinic ${headerId}`);
                return next(new AppError('Unauthorized: You do not belong to this clinic.', 403));
            }
            clinicId = headerId;
        }

        if (!clinicId) {
            return next(new AppError('No clinic context found. Please select a clinic.', 400));
        }

        req.clinicId = clinicId;
        next();
    } catch (error) {
        next(error);
    }
};

export const requireModule = (moduleName: string) => {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            // Super admins bypass module checks
            if (req.user?.role === 'SUPER_ADMIN') return next();

            const clinicId = req.clinicId;
            if (!clinicId) return next(new AppError('No clinic context found.', 400));

            const clinic = await prisma.clinic.findUnique({
                where: { id: clinicId },
                select: { modules: true }
            });

            if (!clinic) return next(new AppError('Clinic not found.', 404));

            const modules = clinic.modules ? JSON.parse(clinic.modules) : {};

            // Normalize module name (e.g. 'Lab' -> 'laboratory')
            let key = moduleName.toLowerCase();
            if (key === 'lab') key = 'laboratory';

            if (!modules[key]) {
                return next(new AppError(`The ${moduleName} module is not enabled for this clinic.`, 403));
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};
