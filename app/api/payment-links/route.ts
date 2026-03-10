import { NextRequest, NextResponse } from "next/server";
import { authenticateMerchant } from "@/lib/auth/merchant-auth";
import { db } from "@/lib/db";
import { eftTransactions, paymentTokens, users } from "@/lib/db/schema";
import { generatePaymentToken } from "@/lib/security/payment-token";
import { checkRateLimit, getClientIdentifier } from "@/lib/security/rate-limit";
import { eq, desc, and, gte } from "drizzle-orm";
import { z } from "zod";
import { dispatchWebhookEvent } from "@/lib/webhooks/dispatcher";

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
    const merchantId = auth.merchantId;

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createPaymentLinkSchema.parse(body);

    // Check for duplicate reference within this merchant's transactions
    const existingRef = await db
      .select({ id: eftTransactions.id })
      .from(eftTransactions)
      .where(
        and(
          eq(eftTransactions.merchantId, merchantId),
          eq(eftTransactions.reference, validatedData.reference)
        )
      )
      .limit(1);

    if (existingRef.length > 0) {
      return NextResponse.json(
        {
          error: "Duplicate reference",
          message: `A payment link with reference "${validatedData.reference}" already exists. Please use a unique reference.`,
        },
        { status: 409 }
      );
    }

    // Fetch merchant's default Pay By Bank URLs and account mode
    const merchant = await db.query.users.findFirst({
      where: eq(users.id, merchantId),
      columns: { eftSettings: true, accountMode: true },
    });
    const eftDefaults = (merchant?.eftSettings as any) || {};
    const isDemo = merchant?.accountMode === 'demo';

    // Create transaction record (per-transaction URLs override merchant defaults)
    const [transaction] = await db
      .insert(eftTransactions)
      .values({
        merchantId,
        amount: validatedData.amount.toString(),
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
        metadata: validatedData.metadata || {},
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
          status: transaction.status,
          customerEmail: transaction.customerEmail || undefined,
          customerName: transaction.customerName || undefined,
          description: transaction.description || undefined,
          paymentUrl,
          expiresAt: expiresAt.toISOString(),
          metadata: transaction.metadata,
          createdAt: transaction.createdAt.toISOString(),
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
        expiresAt: expiresAt.toISOString(),
        status: transaction.status,
        createdAt: transaction.createdAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error("❌ Error creating payment link:", error);

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
