import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { eftTransactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import crypto from "crypto";
import { checkRateLimit, getClientIdentifier } from "@/lib/security/rate-limit";

const webhookSchema = z.object({
  transaction_id: z.string().uuid(),
  status: z.enum(["completed", "failed", "aborted", "cancelled"]),
  amount: z.union([z.string(), z.number()]),
  reference: z.string(),
  customer_bank: z.string().optional(),
  timestamp: z.union([z.string(), z.number()]),
  metadata: z.record(z.string(), z.any()).optional(),
  signature: z.string().optional(), // HMAC signature for verification
});

/**
 * POST /api/eft/webhooks
 * Handle webhooks from EFT Service
 * This endpoint receives payment status updates from the EFT Service
 */
export async function POST(request: NextRequest) {
  // Rate limit: 30 requests per minute for webhooks
  const clientId = getClientIdentifier(request);
  const rateLimitResponse = checkRateLimit(`eft-webhook:${clientId}`, 30);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    // Parse request body
    const body = await request.json();
    
    console.log("📥 Webhook received:", {
      transaction_id: body.transaction_id,
      status: body.status,
      timestamp: new Date().toISOString(),
    });

    // Validate webhook data
    const validatedData = webhookSchema.parse(body);

    // Verify webhook signature — MANDATORY (fail closed)
    const webhookSecret = process.env.EFT_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("❌ EFT_WEBHOOK_SECRET is not configured — rejecting webhook");
      return NextResponse.json(
        { error: "Webhook verification not configured" },
        { status: 500 }
      );
    }

    if (!validatedData.signature) {
      console.error("❌ Missing webhook signature");
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 401 }
      );
    }

    const signaturePayload = JSON.stringify({
      transaction_id: validatedData.transaction_id,
      status: validatedData.status,
      timestamp: validatedData.timestamp,
    });
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(signaturePayload)
      .digest('hex');

    // Constant-time comparison to prevent timing attacks
    const sigBuffer = Buffer.from(validatedData.signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      console.error("❌ Invalid webhook signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // Fetch transaction
    const transaction = await db.query.eftTransactions.findFirst({
      where: eq(eftTransactions.id, validatedData.transaction_id),
    });

    if (!transaction) {
      console.error(`❌ Transaction not found: ${validatedData.transaction_id}`);
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    // Check if transaction is already in final state
    if (["completed", "failed"].includes(transaction.status || "")) {
      console.log(`⚠️ Transaction already in final state: ${transaction.status}`);
      return NextResponse.json({
        success: true,
        message: "Transaction already processed",
        status: transaction.status,
      });
    }

    // Update transaction status
    const [updatedTransaction] = await db
      .update(eftTransactions)
      .set({
        status: validatedData.status,
        completedAt: validatedData.status === "completed" ? new Date() : null,
        updatedAt: new Date(),
        metadata: {
          ...(transaction.metadata as any || {}),
          webhook_received_at: new Date().toISOString(),
          customer_bank: validatedData.customer_bank,
          ...(validatedData.metadata || {}),
        },
      })
      .where(eq(eftTransactions.id, validatedData.transaction_id))
      .returning();

    console.log(`✅ Transaction updated: ${validatedData.transaction_id} -> ${validatedData.status}`);

    // Forward webhook to merchant's notify URL (if configured)
    if (transaction.notifyUrl) {
      try {
        const merchantWebhookPayload = {
          transaction_id: validatedData.transaction_id,
          reference: validatedData.reference,
          amount: parseFloat(validatedData.amount.toString()),
          status: validatedData.status,
          timestamp: validatedData.timestamp,
          metadata: validatedData.metadata,
        };

        const merchantResponse = await fetch(transaction.notifyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-YETOPAYEFT-Signature': generateMerchantSignature(merchantWebhookPayload),
          },
          body: JSON.stringify(merchantWebhookPayload),
        });

        if (merchantResponse.ok) {
          console.log(`✅ Merchant webhook delivered: ${transaction.notifyUrl}`);
        } else {
          console.error(`❌ Merchant webhook failed: ${merchantResponse.status}`);
        }
      } catch (webhookError) {
        console.error("❌ Error forwarding webhook to merchant:", webhookError);
        // Don't fail the main webhook - log and continue
      }
    }

    return NextResponse.json({
      success: true,
      message: "Webhook processed successfully",
      transaction_id: validatedData.transaction_id,
      status: validatedData.status,
    });

  } catch (error: any) {
    console.error("❌ Error processing webhook:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: "Validation error", 
          message: "Invalid webhook data",
          details: error.issues 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: "Internal server error",
        message: "Failed to process webhook" 
      },
      { status: 500 }
    );
  }
}

/**
 * Generate HMAC signature for merchant webhook
 */
function generateMerchantSignature(payload: any): string {
  const secret = process.env.MERCHANT_WEBHOOK_SECRET || process.env.PAYMENT_TOKEN_SECRET || 'default-secret';
  return crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
}

/**
 * GET /api/eft/webhooks
 * Health check endpoint for webhook service
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Webhook endpoint is active",
    timestamp: new Date().toISOString(),
  });
}
