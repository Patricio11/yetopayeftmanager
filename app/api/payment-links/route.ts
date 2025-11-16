import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { eftTransactions, paymentTokens } from "@/lib/db/schema";
import { generatePaymentToken } from "@/lib/security/payment-token";
import { eq, desc, and, gte } from "drizzle-orm";
import { z } from "zod";

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
 * Create a new EFT payment link with secure token
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Please sign in to create payment links" },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createPaymentLinkSchema.parse(body);

    // Create transaction record
    const [transaction] = await db
      .insert(eftTransactions)
      .values({
        merchantId: session.user.id,
        amount: validatedData.amount.toString(),
        reference: validatedData.reference,
        description: validatedData.description,
        customerEmail: validatedData.customerEmail,
        customerName: validatedData.customerName,
        notifyUrl: validatedData.notifyUrl,
        successUrl: validatedData.successUrl,
        failureUrl: validatedData.failureUrl,
        cancelledUrl: validatedData.cancelledUrl,
        status: "not_started",
        createdAt: new Date(),
        metadata: validatedData.metadata || {},
      })
      .returning();

    // Generate secure payment token
    const expiresInHours = validatedData.expiresInHours || 24;
    const token = await generatePaymentToken({
      transactionId: transaction.id,
      merchantId: session.user.id,
      amount: validatedData.amount,
      expiresInHours,
    });

    // Generate payment URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const paymentUrl = `${appUrl}/pay/${token}`;

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    // Log creation (optional - for audit trail)
    console.log(`✅ Payment link created: ${transaction.id} by merchant ${session.user.id}`);

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
          details: error.errors 
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
 * List payment links for authenticated merchant
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100); // Max 100
    const offset = parseInt(searchParams.get("offset") || "0");
    const status = searchParams.get("status"); // Optional status filter
    const fromDate = searchParams.get("from"); // Optional date filter

    // Build where clause
    let whereClause = eq(eftTransactions.merchantId, session.user.id);
    
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

    // Get total count for pagination
    const totalCount = await db.query.eftTransactions.findMany({
      where: eq(eftTransactions.merchantId, session.user.id),
    });

    return NextResponse.json({
      success: true,
      data: transactions.map(t => ({
        ...t,
        amount: parseFloat(t.amount),
      })),
      pagination: {
        limit,
        offset,
        total: totalCount.length,
        hasMore: offset + limit < totalCount.length,
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
