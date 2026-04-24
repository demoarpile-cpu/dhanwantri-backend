import { prisma } from '../lib/prisma.js';
import { AppError } from '../utils/AppError.js';
import * as auditService from './audit.service.js';

const DEFAULT_LOW_STOCK_THRESHOLD = 10;

export const getInventory = async (clinicId: number) => {
    return await prisma.inventory.findMany({
        where: { clinicId },
        orderBy: { name: 'asc' }
    });
};

export const getLowStockInventory = async (clinicId: number, threshold: number = DEFAULT_LOW_STOCK_THRESHOLD) => {
    return await prisma.inventory.findMany({
        where: {
            clinicId,
            quantity: { lte: threshold }
        },
        orderBy: { quantity: 'asc' }
    });
};

export const addInventory = async (clinicId: number, data: any) => {
    const { name, brandName, batchNumber, sku, quantity, unitPrice, expiryDate } = data;

    return await prisma.inventory.create({
        data: {
            clinicId,
            name,
            brandName,
            batchNumber,
            sku,
            quantity: Number(quantity),
            unitPrice: Number(unitPrice),
            expiryDate: expiryDate ? new Date(expiryDate) : null
        }
    });
};

export const updateInventory = async (clinicId: number, id: number, data: any) => {
    const existing = await prisma.inventory.findFirst({ where: { id, clinicId } });
    if (!existing) throw new AppError('Inventory item not found', 404);
    return await prisma.inventory.update({
        where: { id },
        data: {
            name: data.name,
            brandName: data.brandName,
            batchNumber: data.batchNumber,
            sku: data.sku,
            quantity: Number(data.quantity),
            unitPrice: Number(data.unitPrice),
            expiryDate: data.expiryDate ? new Date(data.expiryDate) : null
        }
    });
};

export const deleteInventory = async (clinicId: number, id: number) => {
    const existing = await prisma.inventory.findFirst({ where: { id, clinicId } });
    if (!existing) throw new AppError('Inventory item not found', 404);
    return await prisma.inventory.delete({ where: { id } });
};

export const getPharmacyOrders = async (clinicId: number) => {
    console.log(`[PHARMACY] Fetching orders/prescriptions for clinic ${clinicId}`);

    // 1. Get Service Orders for Pharmacy (legacy/quick-orders)
    const serviceOrders = await prisma.service_order.findMany({
        where: {
            clinicId,
            type: { in: ['PHARMACY', 'Pharmacy', 'pharmacy'] }
        },
        include: {
            patient: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' }
    });

    // 2. Get Prescriptions from Medical Records (new EMR flow)
    const prescribedRecords = await prisma.medicalrecord.findMany({
        where: {
            clinicId,
            type: 'PRESCRIPTION',
            // status: { not: 'Dispensed' } // Removed to include Completed/Dispensed orders
        },
        include: {
            patient: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' }
    });

    const combined = [
        ...serviceOrders.map((o: any) => {
            let items = [];
            try {
                if (o.result && (o.result.startsWith('{') || o.result.startsWith('['))) {
                    const parsed = JSON.parse(o.result);
                    if (Array.isArray(parsed.items)) {
                        items = parsed.items;
                    } else if (parsed.medicineName || parsed.name || parsed.testName) {
                        if (!parsed.medicineName && parsed.testName) parsed.medicineName = parsed.testName;
                        items = [parsed];
                    }
                }
            } catch (e) {
                console.error("Failed to parse order result for pharmacy:", o.id);
            }

            return {
                id: o.id,
                patientName: o.patient?.name,
                testName: items.length > 0
                    ? items.map((i: any) => i.medicineName || i.name || 'Medicine').join(', ')
                    : o.testName,
                items: items,
                status: o.testStatus || o.status,
                paymentStatus: o.paymentStatus,
                result: o.result,
                createdAt: o.createdAt,
                source: 'ORDER'
            };
        }),
        ...prescribedRecords.map((r: any) => {
            let data: any = {};
            try {
                data = JSON.parse(r.data);
            } catch (e) {
                console.error("Failed to parse prescription data for record:", r.id);
            }

            // Fallback for legacy format: if data is a single item (has medicineName but no items array)
            let prescriptionItems = [];
            if (Array.isArray(data.items)) {
                prescriptionItems = data.items;
            } else if (data.medicineName || data.name || data.testName) {
                // Ensure medicineName exists for frontend display
                if (!data.medicineName && data.testName) {
                    data.medicineName = data.testName;
                }
                prescriptionItems = [data]; // Wrap single item into array
            }

            return {
                id: r.id,
                patientName: r.patient?.name,
                testName: prescriptionItems.length > 0
                    ? prescriptionItems.map((i: any) => i.medicineName || i.name || 'Medicine').join(', ')
                    : 'Prescription',
                items: prescriptionItems,
                status: r.status === 'Dispensed' ? 'Completed' : r.status, // Map to Completed for frontend
                paymentStatus: 'Paid',
                result: r.data, // Map data to result so frontend can parse invoice/items if present
                createdAt: r.createdAt,
                source: 'EMR'
            };
        })
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return combined;
};

export const getPharmacyNotificationsCount = async (clinicId: number) => {
    return await prisma.notification.count({
        where: {
            clinicId,
            department: {
                contains: 'pharmacy',
                // mode: 'insensitive' // Optional, based on DB support
            },
            status: 'unread'
        }
    });
};

export const processPharmacyOrder = async (clinicId: number, orderId: number, items: any[] = [], paid: boolean = false, manualAmount?: number, source: 'ORDER' | 'EMR' = 'ORDER') => {
    // If no items passed, use prescription items from order (doctor-prescribed)
    if (!items || items.length === 0) {
        if (source === 'ORDER') {
            const order = await prisma.service_order.findFirst({ where: { id: orderId, clinicId } });
            if (order?.result) {
                try {
                    const parsed = JSON.parse(order.result);
                    if (Array.isArray(parsed?.items) && parsed.items.length > 0) {
                        items = parsed.items.map((i: any) => ({
                            inventoryId: i.inventoryId,
                            quantity: Number(i.quantity) || 1,
                            price: i.unitPrice ?? i.price
                        }));
                    }
                } catch (_) { }
            }
        } else {
            const record = await prisma.medicalrecord.findFirst({ where: { id: orderId, clinicId } });
            if (record?.data) {
                try {
                    const parsed = JSON.parse(record.data);

                    // Support both new {items: []} format and legacy single item format
                    let rawItems = [];
                    if (Array.isArray(parsed?.items)) {
                        rawItems = parsed.items;
                    } else if (parsed?.medicineName || parsed?.name || parsed?.testName) {
                        // Ensure medicineName exists for processing
                        if (!parsed.medicineName && parsed.testName) {
                            parsed.medicineName = parsed.testName;
                        }
                        rawItems = [parsed];
                    }

                    if (rawItems.length > 0) {
                        items = rawItems.map((i: any) => ({
                            inventoryId: i.inventoryId || i.id, // Fallback to id if inventoryId not present
                            quantity: Number(i.quantity) || 1,
                            price: i.unitPrice ?? i.price
                        }));
                    }
                } catch (_) { }
            }
        }
    }

    try {
        const order = source === 'ORDER'
            ? await prisma.service_order.findFirst({ where: { id: orderId, clinicId } })
            : await prisma.medicalrecord.findFirst({ where: { id: orderId, clinicId } });

        if (!order) throw new AppError('Order/Prescription not found', 404);

        // Strict Centralized Billing Rule
        if ((order as any).paymentStatus !== 'Paid' && (source === 'ORDER')) {
            throw new AppError('This order has not been paid for yet. Please direct the patient to the reception for billing.', 400);
        }

        return await prisma.$transaction(async (tx) => {
            let totalAmount = Number(manualAmount) || 0;
            let serviceDetails: string[] = [];

            // If items are provided, calculate total and update inventory
            if (items && items.length > 0) {
                let inventoryTotal = 0;
                for (const item of items) {
                    if (!item.inventoryId) continue;

                    const product = await tx.inventory.findUnique({
                        where: { id: item.inventoryId }
                    });

                    if (!product) continue;

                    if (product.quantity < item.quantity) {
                        throw new AppError(`Insufficient stock for ${product?.name || 'Item'}`, 400);
                    }

                    await tx.inventory.update({
                        where: { id: item.inventoryId },
                        data: { quantity: product.quantity - item.quantity }
                    });

                    inventoryTotal += Number(item.price || item.unitPrice || product.unitPrice) * item.quantity;
                    serviceDetails.push(`${product.name} x${item.quantity}`);
                }
                if (!manualAmount && inventoryTotal > 0) totalAmount = inventoryTotal;
            }

            let patientId: number;
            let doctorId: number;
            let description: string;

            if (source === 'ORDER') {
                const order = await tx.service_order.update({
                    where: { id: orderId },
                    data: { testStatus: 'Completed' }
                });
                patientId = order.patientId;
                doctorId = order.doctorId;
                description = order.testName;
            } else {
                const record = await tx.medicalrecord.update({
                    where: { id: orderId },
                    data: { status: 'Dispensed', isClosed: true }
                });
                patientId = record.patientId;
                doctorId = record.doctorId;
                try {
                    const parsed = JSON.parse(record.data);
                    description = Array.isArray(parsed.items)
                        ? parsed.items.map((i: any) => i.medicineName || i.medicine || i).join(', ')
                        : 'Prescription';
                } catch {
                    description = 'Prescription';
                }
            }


            if (serviceDetails.length === 0) {
                try {
                    const parsed = JSON.parse(description);
                    if (Array.isArray(parsed)) description = parsed.map((i: any) => i.medicine || i.name || i).join(', ');
                } catch (e) { }
                serviceDetails.push(description || `Prescription #${orderId}`);
            }

            // Invoice creation removed - handled by Reception Centralized Billing
            // We just update the statuses to mark it as Dispensed

            // Update Order/Record with result/metadata
            if (source === 'ORDER') {
                await tx.service_order.update({
                    where: { id: orderId },
                    data: {
                        result: JSON.stringify({
                            amount: totalAmount,
                            items: serviceDetails,
                            dispensedAt: new Date()
                        })
                    }
                });
            } else {
                try {
                    const record = await tx.medicalrecord.findUnique({ where: { id: orderId } });
                    if (record) {
                        const parsedData = JSON.parse(record.data);
                        parsedData.amount = totalAmount;
                        parsedData.isDispensed = true;
                        parsedData.dispensedAt = new Date();

                        await tx.medicalrecord.update({
                            where: { id: orderId },
                            data: { data: JSON.stringify(parsedData) }
                        });
                    }
                } catch (e) {
                    console.error("Failed to update medicalrecord data", e);
                }
            }

            return { success: true };
        });
    } catch (error) {
        console.error(`[Pharmacy Service] Error processing ${source} ${orderId}:`, error);
        throw error;
    }
};


export const directSale = async (clinicId: number, data: any) => {
    const { patientId, items } = data;

    return await prisma.$transaction(async (tx) => {
        let totalAmount = 0;
        let serviceDetails = [];

        for (const item of items) {
            const product = await tx.inventory.findUnique({
                where: { id: item.inventoryId }
            });

            if (!product || product.quantity < item.quantity) {
                throw new AppError(`Insufficient stock for ${product?.name || 'Item'}`, 400);
            }

            // Deduct stock
            await tx.inventory.update({
                where: { id: item.inventoryId },
                data: { quantity: product.quantity - item.quantity }
            });

            totalAmount += Number(item.price || product.unitPrice) * item.quantity;
            serviceDetails.push(`${product.name} x${item.quantity}`);
        }

        // Create as a Service Order instead of an Invoice
        const order = await tx.service_order.create({
            data: {
                clinicId,
                patientId: Number(patientId),
                doctorId: 0,
                type: 'PHARMACY',
                testName: `Walk-in Pharmacy Sale: ${serviceDetails.join(', ')}`,
                amount: totalAmount,
                paymentStatus: 'Pending',
                testStatus: 'Pending'
            }
        });

        return { order };
    });
};

export const getPosSales = async (clinicId: number) => {
    return await prisma.invoice.findMany({
        where: {
            clinicId,
            items: {
                some: {
                    description: { contains: 'Pharmacy' }
                }
            }
        },
        include: {
            patient: { select: { id: true, name: true, email: true } },
            items: true
        },
        orderBy: { createdAt: 'desc' }
    });
};

export const updatePosSale = async (clinicId: number, invoiceId: string, data: any) => {
    const { status } = data;
    return await prisma.invoice.update({
        where: { id: invoiceId, clinicId },
        data: status != null ? { status: String(status) } : {}
    });
};

export const deletePosSale = async (clinicId: number, invoiceId: string) => {
    await prisma.invoice.delete({ where: { id: invoiceId, clinicId } });
    return { message: 'Sale deleted' };
};

export const getDailySalesReports = async (clinicId: number, dateStr: string) => {
    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

    const invoices = await prisma.invoice.findMany({
        where: {
            clinicId,
            createdAt: {
                gte: startOfDay,
                lte: endOfDay
            },
            items: {
                some: {
                    serviceType: 'pharmacy'
                }
            }
        },
        include: {
            patient: { select: { name: true } },
            items: {
                where: { serviceType: 'pharmacy' }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    const dailyStats = {
        totalCount: invoices.length,
        totalRevenue: invoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0),
        medicines: [] as any[]
    };

    const medicineMap = new Map<string, { quantity: number, total: number }>();

    invoices.forEach(inv => {
        inv.items.forEach(item => {
            const name = item.description;
            // Parse quantity if possible from description (e.g. "Medicine x2")
            let qty = 1;
            const match = name.match(/x(\d+)$/);
            if (match) {
                qty = parseInt(match[1]);
            }

            const current = medicineMap.get(name) || { quantity: 0, total: 0 };
            medicineMap.set(name, {
                quantity: current.quantity + qty,
                total: current.total + Number(item.amount)
            });
        });
    });

    dailyStats.medicines = Array.from(medicineMap.entries()).map(([name, data]) => ({
        name,
        quantity: data.quantity,
        totalAmount: data.total
    }));

    type ShiftKey = 'Morning' | 'Evening' | 'Night';

    const shiftStats: Record<ShiftKey, { count: number, revenue: number, medicines: any[] }> = {
        Morning: { count: 0, revenue: 0, medicines: [] },
        Evening: { count: 0, revenue: 0, medicines: [] },
        Night: { count: 0, revenue: 0, medicines: [] }
    };

    const getShift = (date: Date): ShiftKey => {
        const h = date.getUTCHours();
        if (h >= 6 && h < 14) return 'Morning';
        if (h >= 14 && h < 22) return 'Evening';
        return 'Night';
    };

    const shiftMedicineMaps = {
        Morning: new Map<string, { quantity: number, total: number }>(),
        Evening: new Map<string, { quantity: number, total: number }>(),
        Night: new Map<string, { quantity: number, total: number }>()
    };

    invoices.forEach(inv => {
        const shift = getShift(new Date(inv.createdAt));
        shiftStats[shift].count++;
        shiftStats[shift].revenue += Number(inv.totalAmount);

        inv.items.forEach(item => {
            const name = item.description;
            let qty = 1;
            const match = name.match(/x(\d+)$/);
            if (match) qty = parseInt(match[1]);

            const current = shiftMedicineMaps[shift].get(name) || { quantity: 0, total: 0 };
            shiftMedicineMaps[shift].set(name, {
                quantity: current.quantity + qty,
                total: current.total + Number(item.amount)
            });
        });
    });

    (Object.keys(shiftStats) as ShiftKey[]).forEach(shift => {
        shiftStats[shift].medicines = Array.from(shiftMedicineMaps[shift].entries()).map(([name, data]) => ({
            name,
            quantity: data.quantity,
            totalAmount: data.total
        }));
    });

    return { daily: dailyStats, shifts: shiftStats };
};
