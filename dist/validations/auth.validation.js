import { z } from 'zod';
export const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    captchaValue: z.string().optional()
});
export const selectClinicSchema = z.object({
    clinicId: z.number().positive('Invalid clinic ID')
});
export const updateClinicModulesSchema = z.object({
    modules: z.record(z.string(), z.boolean())
});
