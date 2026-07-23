import { NextRequest, NextResponse } from "next/server";
import { authenticateMerchant } from "@/lib/auth/merchant-auth";
import { db } from "@/lib/db";
import { eftTransactions, paymentTokens, users, eftBanks } from "@/lib/db/schema";
import { generatePaymentToken } from "@/lib/security/payment-token";
import { checkRateLimit, getClientIdentifier } from "@/lib/security/rate-limit";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { dispatchWebhookEvent } from "@/lib/webhooks/dispatcher";
import {
  subMerchantSchema,
  resolveSubMerchant,
  SubMerchantError,
} from "@/lib/partners/sub-merchants";

const createPaymentLinkSchema = z.object({
  amount: z.number().positive().min(1, "Amount must be at least 1"),
  reference: z.string().min(1, "Reference is required").max(255, "Reference too long"),
  description: z.string().max(500).optional(),
  customerEmail: z.string().email("Invalid email").optional(),
  customerName: z.string().max(255).optional(),
  notifyUrl: z.string().url("Invalid notify URL").optional(),
  successUrl: z.string().url("Invalid success URL").optional(),
  failureUrl: z.string().url("Invalid failure URL").optional(),
  cancelledUrl: z.string().url("Invalid cancelled URL").optional(),
  expiresInHours: z.number().positive().max(168, "Max 7 days").optional(), // Max 7 days
  metadata: z.record(z.string(), z.any()).optional(),
  // Pre-select a bank so the payment page opens directly on that bank's login,
  // skipping the bank picker. Value is a bank code (e.g. "fnb", "nedbank").
  bank: z.string().min(2).max(30).optional(),
  // ISO 4217 currency. Omitted → ZAR (South African banks). "NAD" shows only
  // Namibian banks on the payment page. Must match an enabled bank's currency.
  currency: z.string().trim().length(3, "Currency must be a 3-letter ISO code").optional(),
  // Partner connectors: attribute this transaction to a sub-merchant.
  // First call needs full details; repeat calls can send just { name }.
  merchant: subMerchantSchema.optional(),
});

/**
 * POST /api/payment-links
 * Create a new Pay By Bank payment link with secure token
 * 
 * Supports two authentication methods:
 * 1. Session-based (for dashboard UI)
 * 2. API key-based (for server-to-server integration)
 */
export async function POST(request: NextRequest) {
  // Rate limit check
  const clientId = getClientIdentifier(request);
  const rateLimitResponse = checkRateLimit(`payment-links:${clientId}`);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    // Authenticate via API key or session
    const auth = await authenticateMerchant(request, 'payment_links.create');
    if (!auth.success) return auth.response;
    const callerId = auth.merchantId;

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createPaymentLinkSchema.parse(body);

    // Currency: default ZAR; anything else must be served by at least one
    // enabled bank (e.g. NAD → FNB Namibia). The payment page then shows only
    // banks in this currency.
    const currency = (validatedData.currency || "ZAR").toUpperCase();
    if (currency !== "ZAR") {
      const currencyBank = await db.query.eftBanks.findFirst({
        where: and(eq(eftBanks.currency, currency), eq(eftBanks.enabled, true)),
        columns: { id: true },
      });
      if (!currencyBank) {
        const supported = await db
          .selectDistinct({ currency: eftBanks.currency })
          .from(eftBanks)
          .where(eq(eftBanks.enabled, true));
        return NextResponse.json(
          {
            error: "Unsupported currency",
            message: `No enabled banks accept "${currency}". Supported currencies: ${supported.map((s) => s.currency).join(", ")}.`,
          },
          { status: 400 }
        );
      }
    }

    // Validate the optional pre-selected bank (must be a known, enabled bank
    // in the link's currency). Final per-merchant check happens at page init.
    let preselectedBank: string | undefined;
    if (validatedData.bank) {
      const bankRow = await db.query.eftBanks.findFirst({
        where: and(
          sql`lower(${eftBanks.code}) = ${validatedData.bank.toLowerCase()}`,
          eq(eftBanks.enabled, true)
        ),
        columns: { code: true, currency: true },
      });
      if (!bankRow) {
        return NextResponse.json(
          { error: "Invalid bank", message: `Unknown or disabled bank code "${validatedData.bank}".` },
          { status: 400 }
        );
      }
      if ((bankRow.currency || "ZAR").toUpperCase() !== currency) {
        return NextResponse.json(
          { error: "Bank/currency mismatch", message: `Bank "${bankRow.code}" accepts ${bankRow.currency}, but this link is in ${currency}.` },
          { status: 400 }
        );
      }
      preselectedBank = bankRow.code;
    }

    // Fetch caller's role, default Pay By Bank URLs and account mode
    const caller = await db.query.users.findFirst({
      where: eq(users.id, callerId),
      columns: { role: true, eftSettings: true, accountMode: true, kycStatus: true, metadata: true },
    });

    // ── Partner sub-merchant resolution ────────────────────────────────────
    // Partners integrated via connector can attribute the transaction to one
    // of their merchants. The payment goes to that merchant's bank account.
    let merchantId = callerId;
    let subMerchantInfo: { id: string; name: string; created: boolean; reference?: string } | null = null;

    if (validatedData.merchant) {
      if (caller?.role !== "partner") {
        return NextResponse.json(
          {
            error: "Forbidden",
            message: "Only partner accounts can attribute transactions to a sub-merchant. Remove the \"merchant\" field or use a partner API key.",
          },
          { status: 403 }
        );
      }

      const resolved = await resolveSubMerchant(callerId, validatedData.merchant, {
        accountMode: (caller.accountMode as "demo" | "live") || "demo",
        kycStatus: caller.kycStatus,
        metadata: caller.metadata,
      });

      // Live payments need a payout destination — fail here with a clear
      // message instead of at the payment page.
      if (resolved.merchant.accountMode === "live" && !resolved.hasPrimaryBankAccount) {
        return NextResponse.json(
          {
            error: "Missing bank account",
            message: `Merchant "${resolved.merchant.companyName}" has no bank account on file. Include "merchant.bankAccount" in this request to set one.`,
          },
          { status: 400 }
        );
      }

      merchantId = resolved.merchant.id;
      subMerchantInfo = {
        id: resolved.merchant.id,
        name: resolved.merchant.companyName || resolved.merchant.name,
        created: resolved.created,
        ...(validatedData.merchant.reference ? { reference: validatedData.merchant.reference } : {}),
      };
    }

    // ── Idempotent create per (merchant, reference) ─────────────────────────
    // Re-posting the same reference returns the SAME transaction with a fresh
    // payment token instead of erroring. This makes repeated calls harmless —
    // e.g. Slack/WhatsApp link-preview bots hitting a connector's pay URL used
    // to create one duplicate transaction per unfurl. A finished reference
    // (completed/failed/etc.) still 409s: references are single-use per payment.
    const [existing] = await db
      .select({
        id: eftTransactions.id,
        status: eftTransactions.status,
        amount: eftTransactions.amount,
        currency: eftTransactions.currency,
        createdAt: eftTransactions.createdAt,
      })
      .from(eftTransactions)
      .where(
        and(
          eq(eftTransactions.merchantId, merchantId),
          eq(eftTransactions.reference, validatedData.reference)
        )
      )
      .limit(1);

    if (existing) {
      const OPEN_STATUSES = ["not_started", "initiated", "pending"];
      const sameAmount = parseFloat(existing.amount) === validatedData.amount;
      const sameCurrency = (existing.currency || "ZAR").toUpperCase() === currency;

      if (OPEN_STATUSES.includes(existing.status || "") && sameAmount && sameCurrency) {
        const expiresInHours = validatedData.expiresInHours || 24;
        const token = await generatePaymentToken({
          transactionId: existing.id,
          merchantId,
          amount: validatedData.amount,
          expiresInHours,
        });
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        console.log(`♻️ Idempotent payment link replay: ${existing.id} (ref ${validatedData.reference})`);
        return NextResponse.json({
          success: true,
          message: "Existing payment link returned",
          data: {
            transactionId: existing.id,
            paymentUrl: `${appUrl}/pay/${token}`,
            token,
            reference: validatedData.reference,
            amount: validatedData.amount,
            currency: existing.currency || "ZAR",
            expiresAt: new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString(),
            status: existing.status,
            createdAt: existing.createdAt.toISOString(),
            existing: true,
            ...(subMerchantInfo ? { merchant: subMerchantInfo } : {}),
          },
        });
      }

      return NextResponse.json(
        {
          error: "Duplicate reference",
          message: !sameCurrency
            ? `Reference "${validatedData.reference}" already exists in ${existing.currency || "ZAR"}. Use a new reference.`
            : sameAmount
            ? `Reference "${validatedData.reference}" already belongs to a ${existing.status} payment. Use a new reference.`
            : `Reference "${validatedData.reference}" already exists with a different amount. Use a new reference.`,
        },
        { status: 409 }
      );
    }

    // Effective merchant for URLs/mode: the sub-merchant when set, else caller
    let effectiveMerchant = caller;
    if (merchantId !== callerId) {
      const sub = await db.query.users.findFirst({
        where: eq(users.id, merchantId),
        columns: { role: true, eftSettings: true, accountMode: true, kycStatus: true, metadata: true },
      });
      effectiveMerchant = sub || caller;
    }
    // URL fallbacks: per-call → sub-merchant defaults → partner/caller defaults
    const eftDefaults = {
      ...((caller?.eftSettings as any) || {}),
      ...((effectiveMerchant?.eftSettings as any) || {}),
    };
    const isDemo = effectiveMerchant?.accountMode === 'demo';

    // Create transaction record (per-transaction URLs override merchant defaults)
    const [transaction] = await db
      .insert(eftTransactions)
      .values({
        merchantId,
        amount: validatedData.amount.toString(),
        currency,
        reference: validatedData.reference,
        description: validatedData.description,
        customerEmail: validatedData.customerEmail,
        customerName: validatedData.customerName,
        notifyUrl: validatedData.notifyUrl || eftDefaults.notifyUrl || null,
        successUrl: validatedData.successUrl || eftDefaults.successUrl || null,
        failureUrl: validatedData.failureUrl || eftDefaults.failureUrl || null,
        cancelledUrl: validatedData.cancelledUrl || eftDefaults.cancelledUrl || null,
        status: "not_started",
        isDemo: isDemo,
        createdAt: new Date(),
        metadata: {
          ...(validatedData.metadata || {}),
          ...(preselectedBank ? { preselectedBank } : {}),
          // Sub-merchant's own reference — used for buyer redirect params
          ...(validatedData.merchant?.reference ? { merchantReference: validatedData.merchant.reference } : {}),
        },
      })
      .returning();

    // Generate secure payment token
    const expiresInHours = validatedData.expiresInHours || 24;
    const token = await generatePaymentToken({
      transactionId: transaction.id,
      merchantId,
      amount: validatedData.amount,
      expiresInHours,
    });

    // Generate payment URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const paymentUrl = `${appUrl}/pay/${token}`;

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    // Log creation (optional - for audit trail)
    console.log(`✅ Payment link created: ${transaction.id} by merchant ${merchantId}`);

    // Dispatch transaction.created webhook event
    try {
      await dispatchWebhookEvent(
        merchantId,
        "transaction.created",
        {
          id: transaction.id,
          reference: transaction.reference,
          amount: parseFloat(transaction.amount),
          currency: transaction.currency || "ZAR",
          status: transaction.status,
          customerEmail: transaction.customerEmail || undefined,
          customerName: transaction.customerName || undefined,
          description: transaction.description || undefined,
          paymentUrl,
          expiresAt: expiresAt.toISOString(),
          metadata: transaction.metadata,
          createdAt: transaction.createdAt.toISOString(),
          ...(subMerchantInfo
            ? { merchant: { id: subMerchantInfo.id, name: subMerchantInfo.name, ...(subMerchantInfo.reference ? { reference: subMerchantInfo.reference } : {}) } }
            : {}),
        }
      );
      console.log(`📤 Webhook dispatched: transaction.created for ${transaction.id}`);
    } catch (error) {
      console.error("❌ Error dispatching transaction.created webhook:", error);
      // Don't fail the request if webhook dispatch fails
    }

    return NextResponse.json({
      success: true,
      message: "Payment link created successfully",
      data: {
        transactionId: transaction.id,
        paymentUrl,
        token, // Include token for reference
        reference: transaction.reference,
        amount: parseFloat(transaction.amount),
        currency: transaction.currency || "ZAR",
        expiresAt: expiresAt.toISOString(),
        status: transaction.status,
        createdAt: transaction.createdAt.toISOString(),
        ...(subMerchantInfo ? { merchant: subMerchantInfo } : {}),
      },
    });
  } catch (error: any) {
    console.error("❌ Error creating payment link:", error);

    if (error instanceof SubMerchantError) {
      return NextResponse.json(
        { error: "Merchant error", message: error.message },
        { status: error.status }
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: "Validation error", 
          message: "Invalid request data",
          details: error.issues 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: "Internal server error",
        message: "Failed to create payment link. Please try again."
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/payment-links
 * List payment links for authenticated merchant.
 * Supports both session and API key authentication.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateMerchant(request, 'payment_links.read');
    if (!auth.success) return auth.response;

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100); // Max 100
    const offset = parseInt(searchParams.get("offset") || "0");
    const status = searchParams.get("status"); // Optional status filter
    const fromDate = searchParams.get("from"); // Optional date filter

    // Build where clause
    let whereClause = eq(eftTransactions.merchantId, auth.merchantId);
    
    if (status) {
      whereClause = and(
        whereClause,
        eq(eftTransactions.status, status as any)
      ) as any;
    }
    
    if (fromDate) {
      whereClause = and(
        whereClause,
        gte(eftTransactions.createdAt, new Date(fromDate))
      ) as any;
    }

    // Fetch transactions for merchant
    const transactions = await db.query.eftTransactions.findMany({
      where: whereClause,
      limit,
      offset,
      orderBy: [desc(eftTransactions.createdAt)],
    });

    // Get total count for pagination (efficient COUNT query)
    const countResult = await db
      .select({ count: eftTransactions.id })
      .from(eftTransactions)
      .where(eq(eftTransactions.merchantId, auth.merchantId));
    const total = countResult.length;

    return NextResponse.json({
      success: true,
      data: transactions.map(t => ({
        ...t,
        amount: parseFloat(t.amount),
      })),
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total,
      },
    });
  } catch (error: any) {
    console.error("❌ Error fetching payment links:", error);

    return NextResponse.json(
      { 
        error: "Internal server error",
        message: "Failed to fetch payment links"
      },
      { status: 500 }
    );
  }
}
