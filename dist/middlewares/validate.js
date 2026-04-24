import { ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';
export const validate = (schema) => {
    return async (req, res, next) => {
        try {
            await schema.parseAsync(req.body);
            next();
        }
        catch (error) {
            if (error instanceof ZodError) {
                const message = error.issues.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
                return next(new AppError(message, 400));
            }
            next(error);
        }
    };
};
