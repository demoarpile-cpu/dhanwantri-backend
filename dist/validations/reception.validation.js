import { z } from 'zod';
export const registerPatientSchema = z.object({
    name: z.string().min(2),
    phone: z.string().min(8),
    email: z.string().email().optional().or(z.literal('')),
    dob: z.string().optional(),
    gender: z.enum(['Male', 'Female', 'Other']).optional(),
    address: z.string().optional(),
    medicalHistory: z.string().optional(),
    doctorId: z.number().optional(), // for walk-ins
    visitTime: z.string().optional(),
    fees: z.number().optional()
});
export const bookingSchema = z.object({
    patientId: z.number().optional(), // optional if new patient booking
    patientName: z.string(),
    phone: z.string(),
    email: z.string().email(),
    doctorId: z.number(),
    date: z.string(),
    time: z.string(),
    source: z.enum(['Online', 'Call', 'Walk-in']).optional()
});
