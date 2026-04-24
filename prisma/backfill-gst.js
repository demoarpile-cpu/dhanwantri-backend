import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

const rateArg = args.find((arg) => arg.startsWith('--rate='));
const envRate = process.env.GST_DEFAULT_RATE;
const parsedRate = Number(rateArg ? rateArg.split('=')[1] : envRate ?? 18);
const gstRate = Number.isFinite(parsedRate) && parsedRate >= 0 ? parsedRate : 18;

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const round2 = (value) => Math.round((toNumber(value) + Number.EPSILON) * 100) / 100;

async function run() {
  console.log(`Starting GST backfill | dryRun=${isDryRun} | rate=${gstRate}%`);

  const invoices = await prisma.invoice.findMany({
    include: {
      items: true
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  let skippedHasTax = 0;
  let skippedNoBillableItems = 0;
  let updated = 0;

  for (const invoice of invoices) {
    const taxItems = invoice.items.filter((item) => String(item.serviceType || '').toLowerCase() === 'tax');
    if (taxItems.length > 0) {
      skippedHasTax += 1;
      continue;
    }

    const billableItems = invoice.items.filter((item) => String(item.serviceType || '').toLowerCase() !== 'tax');
    if (billableItems.length === 0) {
      skippedNoBillableItems += 1;
      continue;
    }

    const subtotal = round2(billableItems.reduce((sum, item) => sum + toNumber(item.amount), 0));
    if (subtotal <= 0) {
      skippedNoBillableItems += 1;
      continue;
    }

    const inferredTax = round2(toNumber(invoice.totalAmount) - subtotal);
    const totalTax = inferredTax > 0 ? inferredTax : round2((subtotal * gstRate) / 100);
    const finalTotalAmount = round2(subtotal + totalTax);
    const inferredRate = inferredTax > 0 ? round2((inferredTax * 100) / subtotal) : gstRate;
    const taxMode = 'CGST+SGST';
    const taxDescription = `GST (${inferredRate}%) - ${taxMode}`;

    if (isDryRun) {
      console.log(
        `[DRY-RUN] ${invoice.id} | subtotal=${subtotal} tax=${totalTax} total=${finalTotalAmount} description="${taxDescription}"`
      );
      updated += 1;
      continue;
    }

    await prisma.$transaction([
      prisma.invoice.update({
        where: { id: invoice.id },
        data: { totalAmount: finalTotalAmount }
      }),
      prisma.invoice_item.create({
        data: {
          invoiceId: invoice.id,
          serviceType: 'tax',
          description: taxDescription,
          amount: totalTax
        }
      })
    ]);

    updated += 1;
    console.log(`[UPDATED] ${invoice.id} | subtotal=${subtotal} tax=${totalTax} total=${finalTotalAmount}`);
  }

  console.log('--- GST Backfill Summary ---');
  console.log(`Total invoices scanned: ${invoices.length}`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped (already has tax): ${skippedHasTax}`);
  console.log(`Skipped (no billable items): ${skippedNoBillableItems}`);
}

run()
  .catch((err) => {
    console.error('GST backfill failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
