import { prisma } from '../lib/prisma.js';
export const logAction = async (data) => {
    try {
        await prisma.auditlog.create({
            data: {
                action: data.action,
                performedBy: data.performedBy,
                userId: data.userId,
                clinicId: data.clinicId,
                details: data.details,
                ipAddress: data.ipAddress,
                timestamp: new Date()
            }
        });
    }
    catch (error) {
        console.error('Audit Log Error:', error);
    }
};
