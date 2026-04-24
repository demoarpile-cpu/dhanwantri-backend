import { prisma } from '../lib/prisma.js';

const STATE_ALIAS_MAP: Record<string, string> = {
    andhrapradesh: 'andhra pradesh',
    arunachalpradesh: 'arunachal pradesh',
    assam: 'assam',
    bihar: 'bihar',
    chhattisgarh: 'chhattisgarh',
    goa: 'goa',
    gujarat: 'gujarat',
    haryana: 'haryana',
    himachalpradesh: 'himachal pradesh',
    jharkhand: 'jharkhand',
    karnataka: 'karnataka',
    kerala: 'kerala',
    madhyapradesh: 'madhya pradesh',
    maharashtra: 'maharashtra',
    manipur: 'manipur',
    meghalaya: 'meghalaya',
    mizoram: 'mizoram',
    nagaland: 'nagaland',
    odisha: 'odisha',
    orissa: 'odisha',
    punjab: 'punjab',
    rajasthan: 'rajasthan',
    sikkim: 'sikkim',
    tamilnadu: 'tamil nadu',
    telangana: 'telangana',
    tripura: 'tripura',
    uttarpradesh: 'uttar pradesh',
    uttarakhand: 'uttarakhand',
    westbengal: 'west bengal',
    delhi: 'delhi',
    nctdelhi: 'delhi',
    jammukashmir: 'jammu and kashmir',
    ladakh: 'ladakh',
    puducherry: 'puducherry',
    chandigarh: 'chandigarh',
    andamannicobar: 'andaman and nicobar islands',
    dadranagarhaveli: 'dadra and nagar haveli and daman and diu',
    damandiu: 'dadra and nagar haveli and daman and diu',
    lakshadweep: 'lakshadweep',
    an: 'andaman and nicobar islands',
    ap: 'andhra pradesh',
    ar: 'arunachal pradesh',
    as: 'assam',
    br: 'bihar',
    cg: 'chhattisgarh',
    ga: 'goa',
    gj: 'gujarat',
    hr: 'haryana',
    hp: 'himachal pradesh',
    jh: 'jharkhand',
    ka: 'karnataka',
    kl: 'kerala',
    mp: 'madhya pradesh',
    mh: 'maharashtra',
    mn: 'manipur',
    ml: 'meghalaya',
    mz: 'mizoram',
    nl: 'nagaland',
    od: 'odisha',
    pb: 'punjab',
    rj: 'rajasthan',
    sk: 'sikkim',
    tn: 'tamil nadu',
    ts: 'telangana',
    tr: 'tripura',
    up: 'uttar pradesh',
    uk: 'uttarakhand',
    wb: 'west bengal',
    dl: 'delhi',
    jk: 'jammu and kashmir',
    la: 'ladakh',
    py: 'puducherry',
    ch: 'chandigarh',
    dn: 'dadra and nagar haveli and daman and diu',
    dd: 'dadra and nagar haveli and daman and diu',
    ld: 'lakshadweep'
};

const canonicalState = (value: any) => {
    const compact = String(value || '').toLowerCase().replace(/[^a-z]/g, '');
    if (!compact) return '';
    for (const [alias, canonical] of Object.entries(STATE_ALIAS_MAP)) {
        if (compact.includes(alias)) return canonical;
    }
    return '';
};

const extractState = (stateLike: any) => {
    const raw = String(stateLike || '').trim();
    if (!raw) return '';
    const detected = canonicalState(raw);
    if (detected) return detected;
    const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
    const likelyState = parts.length > 0 ? parts[parts.length - 1] : raw;
    const fromLastPart = canonicalState(likelyState);
    if (fromLastPart) return fromLastPart;
    return likelyState.replace(/[^a-zA-Z\s]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
};

const isInterStateSupply = (clinicState: any, placeOfSupply: any) => {
    const clinic = extractState(clinicState);
    const supply = extractState(placeOfSupply);
    if (!clinic || !supply) return false;
    return clinic !== supply;
};

/** Syncs specific invoiced items to 'Paid' */
const syncInvoiceItemsPayment = async (tx: any, invoiceId: string) => {
    const items = await tx.invoice_item.findMany({
        where: { invoiceId }
    });

    for (const item of items) {
        if (item.serviceType === 'consultation') {
            await tx.appointment.update({
                where: { id: item.serviceId },
                data: { isPaid: true, queueStatus: 'Paid' }
            });
        } else if (['lab', 'radiology', 'pharmacy'].includes(item.serviceType)) {
            await tx.service_order.update({
                where: { id: item.serviceId },
                data: { paymentStatus: 'Paid' }
            });
        }
    }
};

export const getPendingBillingItems = async (clinicId: number, patientId: number) => {
    // 1. Unpaid Consultations (Appointments)
    const appointments = await prisma.appointment.findMany({
        where: {
            clinicId,
            patientId,
            isPaid: false,
            billingAmount: { gt: 0 }
        },
        orderBy: { date: 'desc' }
    });

    // 2. Unpaid Service Orders (Lab, Radiology, Pharmacy)
    const orders = await prisma.service_order.findMany({
        where: {
            clinicId,
            patientId,
            paymentStatus: 'Pending'
        },
        orderBy: { createdAt: 'desc' }
    });

    return {
        consultations: appointments.map(a => ({
            id: a.id,
            type: 'consultation',
            description: `Consultation - ${a.service || 'General'}`,
            amount: Number(a.billingAmount || 0),
            date: a.date
        })),
        orders: orders.map(o => {
            let actualAmount = Number(o.amount || 0);
            let description = `${o.type} Order: ${o.testName}`;

            // Parse result for Pharmacy orders to get dynamic amount and real items
            if (o.type.toUpperCase() === 'PHARMACY' && o.result) {
                try {
                    const parsed = JSON.parse(o.result);

                    // Priority 1: Direct amount field
                    if (parsed.amount !== undefined) {
                        actualAmount = Number(parsed.amount);
                    }
                    // Priority 2: totalAmount from doctor payload
                    else if (parsed.totalAmount !== undefined) {
                        actualAmount = Number(parsed.totalAmount);
                    }
                    // Priority 3: Derived from components (unitPrice * quantity)
                    else if (parsed.unitPrice && parsed.quantity) {
                        actualAmount = Number(parsed.unitPrice) * Number(parsed.quantity);
                    }

                    // Handle Description
                    if (parsed.items && Array.isArray(parsed.items)) {
                        description = `Pharmacy: ${parsed.items.join(', ')}`;
                    } else if (parsed.testName && parsed.quantity) {
                        description = `Pharmacy: ${parsed.testName} x${parsed.quantity}`;
                    } else if (parsed.items) {
                        description = `Pharmacy: ${parsed.items}`;
                    }
                } catch (e) {
                    console.error("Failed to parse pharmacy order result for billing:", o.id);
                }
            }

            return {
                id: o.id,
                type: o.type.toLowerCase(),
                description,
                amount: actualAmount,
                date: o.createdAt
            };
        })
    };
};

export const getAccountingDashboardStats = async (clinicId: number) => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const [invoices, paidToday, pendingSum, pendingCount] = await Promise.all([
        prisma.invoice.findMany({
            where: { clinicId },
            include: { patient: { select: { name: true } } },
            orderBy: { date: 'desc' },
            take: 10
        }),
        prisma.invoice.aggregate({
            where: {
                clinicId,
                status: 'Paid',
                date: { gte: todayStart, lt: todayEnd }
            },
            _sum: { totalAmount: true }
        }),
        prisma.invoice.aggregate({
            where: { clinicId, status: 'Pending' },
            _sum: { totalAmount: true }
        }),
        prisma.invoice.count({
            where: { clinicId, status: 'Pending' }
        })
    ]);

    return {
        todayIncome: Number(paidToday._sum.totalAmount || 0),
        pendingPayments: Number(pendingSum._sum.totalAmount || 0),
        expenses: 0,
        pendingInvoicesCount: pendingCount,
        recentInvoices: invoices
    };
};

export const getInvoices = async (clinicId: number) => {
    const invoices = await prisma.invoice.findMany({
        where: { clinicId },
        include: {
            patient: true,
            items: true
        },
        orderBy: { createdAt: 'desc' }
    });

    return invoices.map((invoice: any) => {
        const taxItems = (invoice.items || []).filter((item: any) => String(item.serviceType || '').toLowerCase() === 'tax');
        const remarkItems = (invoice.items || []).filter((item: any) => String(item.serviceType || '').toLowerCase() === 'remark');
        const billableItems = (invoice.items || []).filter((item: any) => !['tax', 'remark'].includes(String(item.serviceType || '').toLowerCase()));
        const subtotal = billableItems.reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0);
        const totalTax = taxItems.reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0);

        // Recover GST rate from stored tax line description: "GST (18%) - CGST+SGST"
        let gstRate = 0;
        const rateMatch = taxItems[0]?.description?.match(/\(([\d.]+)%\)/);
        if (rateMatch) gstRate = Number(rateMatch[1] || 0);

        const taxMode = taxItems[0]?.description?.toUpperCase().includes('IGST') ? 'IGST' : 'CGST_SGST';
        const cgst = taxMode === 'IGST' ? 0 : Number((totalTax / 2).toFixed(2));
        const sgst = taxMode === 'IGST' ? 0 : Number((totalTax - cgst).toFixed(2));
        const igst = taxMode === 'IGST' ? totalTax : 0;

        return {
            ...invoice,
            items: billableItems,
            subtotal,
            gstRate,
            totalTax,
            remarks: remarkItems[0]?.description || null,
            taxSummary: {
                subtotal,
                gstRate,
                cgst,
                sgst,
                igst,
                totalTax,
                grandTotal: Number(invoice.totalAmount || 0),
                taxMode
            }
        };
    });
};

export const updateInvoiceStatus = async (clinicId: number, id: string, status: string, paymentMethod?: string) => {
    return await prisma.$transaction(async (tx) => {
        const invoice = await tx.invoice.update({
            where: { id, clinicId },
            data: {
                status,
                paymentMethod: paymentMethod || undefined
            }
        });

        if (status === 'Paid') {
            await syncInvoiceItemsPayment(tx, id);
        }

        return invoice;
    });
};

export const createInvoice = async (clinicId: number, data: any) => {
    const { patientId, visitId, items, status, paymentMethod, createdBy, subtotal, totalTax, gstRate, taxSummary, placeOfSupply, remarks } = data;

    const pId = Number(patientId);
    if (!pId || isNaN(pId)) {
        throw new Error('Invalid Patient. Please select a patient.');
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
        throw new Error('Invoice must have at least one item.');
    }

    const computedSubtotal = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const normalizedSubtotal = Number(subtotal ?? computedSubtotal ?? 0);
    const normalizedTax = Number(totalTax ?? taxSummary?.totalTax ?? 0);
    const totalAmount = Number(data.totalAmount ?? (normalizedSubtotal + normalizedTax));

    return await prisma.$transaction(async (tx) => {
        const invoiceId = `INV-${Math.floor(10000 + Math.random() * 90000)}-${Date.now().toString().slice(-4)}`;
        const clinic = await tx.clinic.findUnique({
            where: { id: clinicId },
            select: { location: true }
        });
        const interstate = isInterStateSupply(clinic?.location, placeOfSupply);
        const taxLabel = interstate ? 'IGST' : 'CGST+SGST';

        const invoice = await tx.invoice.create({
            data: {
                id: invoiceId,
                clinicId,
                patientId: pId,
                visitId: visitId ? Number(visitId) : undefined,
                totalAmount,
                status: status || 'Pending',
                paymentMethod,
                createdBy
            }
        });

        // Create Invoice Items
        for (const item of items) {
            await tx.invoice_item.create({
                data: {
                    invoiceId: invoice.id,
                    serviceType: item.type,
                    serviceId: item.id,
                    description: item.description,
                    amount: Number(item.amount || 0)
                }
            });
        }

        if (normalizedTax > 0) {
            await tx.invoice_item.create({
                data: {
                    invoiceId: invoice.id,
                    serviceType: 'tax',
                    description: `GST (${Number(gstRate || taxSummary?.gstRate || 0)}%) - ${taxLabel}`,
                    amount: normalizedTax
                }
            });
        }

        if (String(remarks || '').trim()) {
            await tx.invoice_item.create({
                data: {
                    invoiceId: invoice.id,
                    serviceType: 'remark',
                    description: String(remarks).trim(),
                    amount: 0
                }
            });
        }

        if (invoice.status === 'Paid') {
            await syncInvoiceItemsPayment(tx, invoice.id);
        }

        return invoice;
    });
};

export const getCorporatePharmacySummary = async (clinicId: number, month?: string) => {
    const targetMonth = month && /^\d{4}-\d{2}$/.test(month)
        ? month
        : new Date().toISOString().slice(0, 7);

    const startDate = new Date(`${targetMonth}-01T00:00:00.000Z`);
    const endDate = new Date(startDate);
    endDate.setUTCMonth(endDate.getUTCMonth() + 1);

    const invoices = await prisma.invoice.findMany({
        where: {
            clinicId,
            createdAt: { gte: startDate, lt: endDate },
            items: {
                some: {
                    serviceType: 'pharmacy'
                }
            }
        },
        include: {
            items: true,
            patient: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' }
    });

    const userConsumption = invoices.map(inv => ({
        companyName: 'Corporate Account',
        userName: inv.patient?.name || 'Unknown',
        employeeCode: '',
        medicines: inv.items
            .filter(i => i.serviceType === 'pharmacy')
            .map(i => ({ name: i.description || 'Medicine', quantity: 1 })),
        totalAmount: Number(inv.totalAmount || 0)
    }));

    const medicineMap = new Map<string, number>();
    userConsumption.forEach(u => {
        u.medicines.forEach(m => {
            medicineMap.set(m.name, (medicineMap.get(m.name) || 0) + Number(m.quantity || 0));
        });
    });

    const medicineConsumption = Array.from(medicineMap.entries()).map(([name, quantity]) => ({ name, quantity }));

    return {
        month: targetMonth,
        totalBills: invoices.length,
        totalUsers: userConsumption.length,
        totalAmount: userConsumption.reduce((sum, u) => sum + Number(u.totalAmount || 0), 0),
        userConsumption,
        medicineConsumption
    };
};
