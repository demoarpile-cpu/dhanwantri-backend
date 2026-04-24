import { z } from 'zod';

export const createClinicSchema = z.object({
    name: z.string().min(2, 'Name is too short'),
    location: z.string().min(2, 'Address is too short'),
    email: z.string().email(),
    contact: z.string().min(8, 'Phone is too short'),
    subdomain: z.string().optional(),
    logo: z.any().optional()
});



export const createStaffSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum(['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'RECEPTIONIST', 'PATIENT']),
    clinicId: z.coerce.number().optional()
});
