import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';

export const validate = (schema: ZodSchema) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await schema.parseAsync(req.body);
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const message = error.issues.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
                return next(new AppError(message, 400));
            }
            next(error);
        }
    };
};
