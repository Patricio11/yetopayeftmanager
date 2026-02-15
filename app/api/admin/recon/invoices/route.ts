import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { eftInvoices, eftInvoiceItems, eftMerchantFees, eftSystemFees, eftTransactions, users } from "@/lib/db/schema";
import { eq, and, gte, lte, sql, desc, count } from "drizzle-orm";

// GET /api/admin/recon/invoices — list all invoices (admin only)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return auth.response;

    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const merchantId = url.searchParams.get("merchantId");
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    // Build conditions
    const conditions = [];
    if (status && status !== "all") {
      conditions.push(eq(eftInvoices.status, status as any));
    }
    if (merchantId) {
      conditions.push(eq(eftInvoices.merchantId, merchantId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const invoices = await db
      .select({
        id: eftInvoices.id,
        invoiceNumber: eftInvoices.invoiceNumber,
        merchantId: eftInvoices.merchantId,
        merchantName: users.companyName,
        merchantEmail: users.email,
        periodStart: eftInvoices.periodStart,
        periodEnd: eftInvoices.periodEnd,
        subtotalAmount: eftInvoices.subtotalAmount,
        vatAmount: eftInvoices.vatAmount,
        totalAmount: eftInvoices.totalAmount,
        transactionCount: eftInvoices.transactionCount,
        transactionVolume: eftInvoices.transactionVolume,
        feeType: eftInvoices.feeType,
        feeValue: eftInvoices.feeValue,
        vatRate: eftInvoices.vatRate,
        vatEnabled: eftInvoices.vatEnabled,
        status: eftInvoices.status,
        dueDate: eftInvoices.dueDate,
        paidAt: eftInvoices.paidAt,
        sentAt: eftInvoices.sentAt,
        notes: eftInvoices.notes,
        createdAt: eftInvoices.createdAt,
      })
      .from(eftInvoices)
      .leftJoin(users, eq(eftInvoices.merchantId, users.id))
      .where(whereClause)
      .orderBy(desc(eftInvoices.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(eftInvoices)
      .where(whereClause);

    return NextResponse.json({
      success: true,
      data: invoices,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// POST /api/admin/recon/invoices — generate invoice for a merchant
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return auth.response;

    const body = await request.json();
    const { merchantId, periodStart, periodEnd, notes, dueDate } = body;

    if (!merchantId || !periodStart || !periodEnd) {
      return NextResponse.json(
        { success: false, message: "merchantId, periodStart, and periodEnd are required" },
        { status: 400 }
      );
    }

    const startDate = new Date(periodStart);
    const endDate = new Date(periodEnd);

    // Check for existing invoice for this merchant + period (idempotency guard)
    const [existingInvoice] = await db
      .select({ id: eftInvoices.id, invoiceNumber: eftInvoices.invoiceNumber, status: eftInvoices.status })
      .from(eftInvoices)
      .where(
        and(
          eq(eftInvoices.merchantId, merchantId),
          eq(eftInvoices.periodStart, startDate),
          eq(eftInvoices.periodEnd, endDate)
        )
      );

    if (existingInvoice) {
      return NextResponse.json(
        {
          success: false,
          message: `An invoice already exists for this merchant and period (${existingInvoice.invoiceNumber}, status: ${existingInvoice.status})`,
          existingInvoiceId: existingInvoice.id,
        },
        { status: 409 }
      );
    }

    // 1. Fetch completed transactions for this merchant in the period
    const transactions = await db
      .select({
        id: eftTransactions.id,
        amount: eftTransactions.amount,
        reference: eftTransactions.reference,
        completedAt: eftTransactions.completedAt,
      })
      .from(eftTransactions)
      .where(
        and(
          eq(eftTransactions.merchantId, merchantId),
          eq(eftTransactions.status, "completed"),
          gte(eftTransactions.completedAt, startDate),
          lte(eftTransactions.completedAt, endDate)
        )
      );

    if (transactions.length === 0) {
      return NextResponse.json(
        { success: false, message: "No completed transactions found for this period" },
        { status: 400 }
      );
    }

    // 2. Get fee config: merchant feeType + resolve the actual fee value
    // System defaults (always loaded as fallback)
    const sysRows = await db.select().from(eftSystemFees).limit(1);
    const sys = sysRows[0] || {
      fixedFeeValue: "5.00",
      percentageFeeValue: "2.50",
      vatEnabled: true,
      vatRate: "15.00",
    };

    // Merchant-specific config (may or may not exist)
    const merchantFee = await db.query.eftMerchantFees.findFirst({
      where: eq(eftMerchantFees.merchantId, merchantId),
    });

    // Determine fee type: merchant setting or default to "fixed"
    const feeType = (merchantFee?.isActive && merchantFee?.feeType) || "fixed";

    // Determine fee value: merchant custom > system default
    let feeValue: string;
    if (feeType === "fixed") {
      feeValue = (merchantFee?.isActive && merchantFee?.fixedFeeValue) || sys.fixedFeeValue;
    } else if (feeType === "percentage") {
      feeValue = (merchantFee?.isActive && merchantFee?.percentageFeeValue) || sys.percentageFeeValue;
    } else {
      // volume: percentage of total transaction volume
      feeValue = (merchantFee?.isActive && merchantFee?.volumeFeeValue) || sys.volumeFeeValue || "0.0500";
    }

    // VAT: merchant override > system default
    const vatEnabled = (merchantFee?.isActive && merchantFee?.vatEnabled !== null)
      ? merchantFee.vatEnabled!
      : (sys.vatEnabled ?? true);
    const vatRateStr = (merchantFee?.isActive && merchantFee?.vatRate !== null)
      ? merchantFee.vatRate!
      : (sys.vatRate || "15.00");

    const feeConfig = { feeType, feeValue, vatEnabled, vatRate: vatRateStr };

    // 3. Calculate totals
    const txnCount = transactions.length;
    const txnVolume = transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const feeVal = parseFloat(feeConfig.feeValue);

    let subtotal: number;
    if (feeConfig.feeType === "fixed") {
      subtotal = txnCount * feeVal;
    } else if (feeConfig.feeType === "percentage") {
      subtotal = txnVolume * (feeVal / 100);
    } else {
      // volume: percentage of total transaction volume
      subtotal = txnVolume * (feeVal / 100);
    }

    const vatRate = parseFloat(feeConfig.vatRate);
    const vatAmount = feeConfig.vatEnabled ? subtotal * (vatRate / 100) : 0;
    const totalAmount = subtotal + vatAmount;

    // 4. Generate invoice number
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    const [{ seqCount }] = await db
      .select({ seqCount: count() })
      .from(eftInvoices);
    const seq = String(seqCount + 1).padStart(4, "0");
    const invoiceNumber = `INV-${year}${month}-${seq}`;

    // 5. Create invoice
    const [invoice] = await db.insert(eftInvoices).values({
      invoiceNumber,
      merchantId,
      periodStart: startDate,
      periodEnd: endDate,
      subtotalAmount: subtotal.toFixed(2),
      vatAmount: vatAmount.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      transactionCount: txnCount,
      transactionVolume: txnVolume.toFixed(2),
      feeType: feeConfig.feeType as "fixed" | "percentage",
      feeValue: feeConfig.feeValue,
      vatRate: feeConfig.vatRate,
      vatEnabled: feeConfig.vatEnabled,
      status: "draft",
      dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default: 30 days
      notes: notes || null,
      createdBy: auth.session.user.id,
    }).returning();

    // 6. Create line item(s)
    let feeDescription: string;
    let lineQuantity: number;
    let lineUnitAmount: string;

    if (feeConfig.feeType === "fixed") {
      feeDescription = `EFT Transaction Fees (R${feeVal.toFixed(2)} per transaction)`;
      lineQuantity = txnCount;
      lineUnitAmount = feeVal.toFixed(4);
    } else if (feeConfig.feeType === "percentage") {
      feeDescription = `EFT Transaction Fees (${feeVal}% of transaction volume)`;
      lineQuantity = 1;
      lineUnitAmount = txnVolume.toFixed(4);
    } else {
      feeDescription = `EFT Volume-Based Fee (${feeVal}% of R${txnVolume.toFixed(2)} total volume, ${txnCount} transactions)`;
      lineQuantity = 1;
      lineUnitAmount = txnVolume.toFixed(4);
    }

    const periodLabel = `${startDate.toLocaleDateString("en-ZA", { month: "long", year: "numeric" })}`;

    await db.insert(eftInvoiceItems).values({
      invoiceId: invoice.id,
      description: `${feeDescription} — ${periodLabel}`,
      quantity: lineQuantity,
      unitAmount: lineUnitAmount,
      totalAmount: subtotal.toFixed(2),
    });

    // Fetch merchant info for response
    const merchant = await db.query.users.findFirst({
      where: eq(users.id, merchantId),
    });

    return NextResponse.json({
      success: true,
      data: {
        ...invoice,
        merchantName: merchant?.companyName || merchant?.name,
        merchantEmail: merchant?.email,
      },
    });
  } catch (error: any) {
    console.error("Error generating invoice:", error);

    // Handle unique constraint violation (concurrent duplicate request)
    if (error?.code === "23505" || error?.message?.includes("unique constraint")) {
      return NextResponse.json(
        { success: false, message: "An invoice already exists for this merchant and period" },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
