import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { eftInvoices, eftInvoiceItems, eftMerchantFees, eftSystemFees, eftTransactions, users } from "@/lib/db/schema";
import { eq, and, gte, lte, sql, desc, count, inArray } from "drizzle-orm";
import { writeAuditLog } from "@/lib/audit";

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

    // 1. Fetch completed transactions for this merchant in the period (include paymentMethod)
    const transactions = await db
      .select({
        id: eftTransactions.id,
        amount: eftTransactions.amount,
        reference: eftTransactions.reference,
        completedAt: eftTransactions.completedAt,
        paymentMethod: eftTransactions.paymentMethod,
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

    // 2. Group transactions by paymentMethod (service)
    const serviceGroups = new Map<string, typeof transactions>();
    for (const txn of transactions) {
      const service = txn.paymentMethod || "eft_direct";
      if (!serviceGroups.has(service)) {
        serviceGroups.set(service, []);
      }
      serviceGroups.get(service)!.push(txn);
    }

    const serviceNames = Array.from(serviceGroups.keys());

    // 3. Load fee configs for ALL services involved
    // System defaults per service
    const sysRows = await db
      .select()
      .from(eftSystemFees)
      .where(inArray(eftSystemFees.serviceName, serviceNames));

    const sysDefaults = {
      fixedFeeValue: "5.00",
      percentageFeeValue: "2.50",
      volumeFeeValue: "2.00",
      vatEnabled: true,
      vatRate: "15.00",
    };

    // Index system fees by serviceName for quick lookup
    const sysFeeMap = new Map<string, typeof sysRows[0]>();
    for (const row of sysRows) {
      sysFeeMap.set(row.serviceName || "eft_direct", row);
    }

    // Merchant-specific configs per service
    const merchantFeeRows = await db
      .select()
      .from(eftMerchantFees)
      .where(
        and(
          eq(eftMerchantFees.merchantId, merchantId),
          inArray(eftMerchantFees.serviceName, serviceNames)
        )
      );

    const merchantFeeMap = new Map<string, typeof merchantFeeRows[0]>();
    for (const row of merchantFeeRows) {
      merchantFeeMap.set(row.serviceName || "eft_direct", row);
    }

    // 4. Calculate fees per service group
    type ServiceResult = {
      serviceName: string;
      feeType: string;
      feeValue: string;
      vatEnabled: boolean;
      vatRate: string;
      txnCount: number;
      txnVolume: number;
      subtotal: number;
      vatAmount: number;
      total: number;
    };

    const serviceResults: ServiceResult[] = [];

    for (const [serviceName, txns] of serviceGroups) {
      const sys = sysFeeMap.get(serviceName) || null;
      const merchantFee = merchantFeeMap.get(serviceName) || null;

      // Determine fee type: merchant setting > default "fixed"
      const feeType = (merchantFee?.isActive && merchantFee?.feeType) || "fixed";

      // Determine fee value: merchant custom > system default > hardcoded default
      let feeValue: string;
      if (feeType === "fixed") {
        feeValue = (merchantFee?.isActive && merchantFee?.fixedFeeValue) || sys?.fixedFeeValue || sysDefaults.fixedFeeValue;
      } else if (feeType === "percentage") {
        feeValue = (merchantFee?.isActive && merchantFee?.percentageFeeValue) || sys?.percentageFeeValue || sysDefaults.percentageFeeValue;
      } else {
        feeValue = (merchantFee?.isActive && merchantFee?.volumeFeeValue) || sys?.volumeFeeValue || sysDefaults.volumeFeeValue;
      }

      // VAT: merchant override > system default > hardcoded default
      const vatEnabled = (merchantFee?.isActive && merchantFee?.vatEnabled !== null)
        ? merchantFee.vatEnabled!
        : (sys?.vatEnabled ?? sysDefaults.vatEnabled);
      const vatRateStr = (merchantFee?.isActive && merchantFee?.vatRate !== null)
        ? merchantFee.vatRate!
        : (sys?.vatRate || sysDefaults.vatRate);

      const txnCount = txns.length;
      const txnVolume = txns.reduce((sum, t) => sum + parseFloat(t.amount), 0);
      const feeVal = parseFloat(feeValue);

      let subtotal: number;
      if (feeType === "fixed") {
        subtotal = txnCount * feeVal;
      } else if (feeType === "percentage") {
        subtotal = txnVolume * (feeVal / 100);
      } else {
        subtotal = txnVolume * (feeVal / 100);
      }

      const vatRate = parseFloat(vatRateStr);
      const vatAmount = vatEnabled ? subtotal * (vatRate / 100) : 0;
      const total = subtotal + vatAmount;

      serviceResults.push({
        serviceName,
        feeType,
        feeValue,
        vatEnabled,
        vatRate: vatRateStr,
        txnCount,
        txnVolume,
        subtotal,
        vatAmount,
        total,
      });
    }

    // 5. Aggregate totals across all services
    const totalTxnCount = serviceResults.reduce((sum, s) => sum + s.txnCount, 0);
    const totalTxnVolume = serviceResults.reduce((sum, s) => sum + s.txnVolume, 0);
    const subtotal = serviceResults.reduce((sum, s) => sum + s.subtotal, 0);
    const vatAmount = serviceResults.reduce((sum, s) => sum + s.vatAmount, 0);
    const totalAmount = subtotal + vatAmount;

    // Invoice-level feeType/feeValue snapshot: use the service with the most transactions
    // (ties broken alphabetically by serviceName)
    const primaryService = serviceResults
      .sort((a, b) => b.txnCount - a.txnCount || a.serviceName.localeCompare(b.serviceName))[0];

    // 6. Generate invoice number
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    const [{ seqCount }] = await db
      .select({ seqCount: count() })
      .from(eftInvoices);
    const seq = String(seqCount + 1).padStart(4, "0");
    const invoiceNumber = `INV-${year}${month}-${seq}`;

    // 7. Create invoice
    const [invoice] = await db.insert(eftInvoices).values({
      invoiceNumber,
      merchantId,
      periodStart: startDate,
      periodEnd: endDate,
      subtotalAmount: subtotal.toFixed(2),
      vatAmount: vatAmount.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      transactionCount: totalTxnCount,
      transactionVolume: totalTxnVolume.toFixed(2),
      feeType: primaryService.feeType as "fixed" | "percentage" | "volume",
      feeValue: primaryService.feeValue,
      vatRate: primaryService.vatRate,
      vatEnabled: primaryService.vatEnabled,
      status: "draft",
      dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default: 30 days
      notes: notes || null,
      createdBy: auth.session.user.id,
    }).returning();

    // 8. Create line items — one per service
    const periodLabel = `${startDate.toLocaleDateString("en-ZA", { month: "long", year: "numeric" })}`;

    const lineItemValues = serviceResults.map((svc) => {
      const feeVal = parseFloat(svc.feeValue);
      let feeDescription: string;
      let lineQuantity: number;
      let lineUnitAmount: string;

      // Human-readable service label
      const serviceLabel = svc.serviceName === "eft_direct" ? "EFT"
        : svc.serviceName === "card_callpay" ? "Card (Callpay)"
        : svc.serviceName.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

      if (svc.feeType === "fixed") {
        feeDescription = `${serviceLabel} Transaction Fees (R${feeVal.toFixed(2)} per transaction)`;
        lineQuantity = svc.txnCount;
        lineUnitAmount = feeVal.toFixed(4);
      } else if (svc.feeType === "percentage") {
        feeDescription = `${serviceLabel} Transaction Fees (${feeVal}% of transaction volume)`;
        lineQuantity = 1;
        lineUnitAmount = svc.txnVolume.toFixed(4);
      } else {
        feeDescription = `${serviceLabel} Volume-Based Fee (${feeVal}% of total volume R${svc.txnVolume.toFixed(2)}, ${svc.txnCount} transactions)`;
        lineQuantity = 1;
        lineUnitAmount = svc.txnVolume.toFixed(4);
      }

      return {
        invoiceId: invoice.id,
        serviceName: svc.serviceName,
        description: `${feeDescription} — ${periodLabel}`,
        quantity: lineQuantity,
        unitAmount: lineUnitAmount,
        totalAmount: svc.subtotal.toFixed(2),
      };
    });

    await db.insert(eftInvoiceItems).values(lineItemValues);

    writeAuditLog({ userId: auth.session.user.id, action: "create", resource: "invoice", resourceId: invoice.id, changes: { after: { invoiceNumber, merchantId, periodStart, periodEnd, totalAmount: totalAmount.toFixed(2), feeType: primaryService.feeType, transactionCount: totalTxnCount, services: serviceNames } }, request });

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
