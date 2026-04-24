import { z } from 'zod';
export const assessmentSchema = z.object({
    patientId: z.number(),
    templateId: z.number(),
    type: z.string(),
    findings: z.record(z.string(), z.any()),
    pharmacyOrder: z.string().optional(),
    labOrder: z.string().optional(),
    radiologyOrder: z.string().optional()
});
