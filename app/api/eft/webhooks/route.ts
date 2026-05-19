import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { eftTransactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import crypto from "crypto";
import { checkRateLimit, getClientIdentifier } from "@/lib/security/rate-limit";
import { dispatchWebhookEvent } from "@/lib/webhooks/dispatcher";
import { checkBankHealth } from "@/lib/monitoring/bank-health";

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

    // Signature payload includes amount to prevent amount tampering.
    // For backward compat: try amount-inclusive signature first, then legacy (without amount).
    const signaturePayloadWithAmount = JSON.stringify({
      transaction_id: validatedData.transaction_id,
      status: validatedData.status,
      amount: validatedData.amount.toString(),
      timestamp: validatedData.timestamp,
    });
    const expectedWithAmount = crypto
      .createHmac('sha256', webhookSecret)
      .update(signaturePayloadWithAmount)
      .digest('hex');

    const signaturePayloadLegacy = JSON.stringify({
      transaction_id: validatedData.transaction_id,
      status: validatedData.status,
      timestamp: validatedData.timestamp,
    });
    const expectedLegacy = crypto
      .createHmac('sha256', webhookSecret)
      .update(signaturePayloadLegacy)
      .digest('hex');

    // Constant-time comparison to prevent timing attacks
    // Accept either amount-inclusive (preferred) or legacy signature
    const sigBuffer = Buffer.from(validatedData.signature);
    const withAmountBuffer = Buffer.from(expectedWithAmount);
    const legacyBuffer = Buffer.from(expectedLegacy);

    const matchesWithAmount = sigBuffer.length === withAmountBuffer.length &&
      crypto.timingSafeEqual(sigBuffer, withAmountBuffer);
    const matchesLegacy = !matchesWithAmount && sigBuffer.length === legacyBuffer.length &&
      crypto.timingSafeEqual(sigBuffer, legacyBuffer);

    if (!matchesWithAmount && !matchesLegacy) {
      console.error("❌ Invalid webhook signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    if (matchesLegacy) {
      console.warn("⚠️ Webhook using legacy signature (without amount) — update EFT service to include amount in signature payload");
    }

    // Validate timestamp freshness (reject webhooks older than 5 minutes to prevent replay)
    const webhookTimestamp = typeof validatedData.timestamp === 'string'
      ? new Date(validatedData.timestamp).getTime()
      : validatedData.timestamp;
    const now = Date.now();
    const MAX_WEBHOOK_AGE_MS = 5 * 60 * 1000; // 5 minutes
    if (isNaN(webhookTimestamp) || Math.abs(now - webhookTimestamp) > MAX_WEBHOOK_AGE_MS) {
      console.error(`❌ Webhook timestamp too old or invalid: ${validatedData.timestamp} (age: ${Math.abs(now - webhookTimestamp)}ms)`);
      return NextResponse.json(
        { error: "Webhook timestamp expired or invalid" },
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

    // Verify webhook amount matches DB amount (prevent amount tampering)
    const webhookAmount = parseFloat(validatedData.amount.toString());
    const dbAmount = parseFloat(transaction.amount);
    if (Math.abs(webhookAmount - dbAmount) > 0.001) {
      console.error(`❌ Webhook amount mismatch: webhook=${webhookAmount}, db=${dbAmount} for ${validatedData.transaction_id}`);
      return NextResponse.json(
        { error: "Amount mismatch" },
        { status: 400 }
      );
    }

    // Check if transaction is already in final state
    if (["completed", "failed", "aborted", "cancelled", "expired"].includes(transaction.status || "")) {
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

    // Fire-and-forget bank health check
    checkBankHealth(updatedTransaction.eftBankId, validatedData.status).catch(() => {});

    // Dispatch to merchant's configured webhook endpoints
    try {
      const webhookEventData = {
        id: updatedTransaction.id,
        reference: updatedTransaction.reference,
        amount: parseFloat(updatedTransaction.amount),
        status: updatedTransaction.status,
        customerEmail: updatedTransaction.customerEmail || undefined,
        customerName: updatedTransaction.customerName || undefined,
        bankName: validatedData.customer_bank,
        metadata: updatedTransaction.metadata,
        createdAt: updatedTransaction.createdAt?.toISOString(),
        completedAt: updatedTransaction.completedAt?.toISOString(),
      };

      if (validatedData.status === "completed") {
        await dispatchWebhookEvent(transaction.merchantId, "payment.completed", webhookEventData);
      } else if (validatedData.status === "failed") {
        await dispatchWebhookEvent(transaction.merchantId, "payment.failed", webhookEventData);
      } else if (validatedData.status === "cancelled" || validatedData.status === "aborted") {
        await dispatchWebhookEvent(transaction.merchantId, "payment.cancelled", webhookEventData);
      }
      console.log(`📤 Webhook dispatched: payment.${validatedData.status} for ${validatedData.transaction_id}`);
    } catch (error) {
      console.error("❌ Error dispatching webhook event:", error);
    }

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
            'X-YetoPay-Signature': generateMerchantSignature(merchantWebhookPayload),
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
  const secret = process.env.MERCHANT_WEBHOOK_SECRET || process.env.EFT_WEBHOOK_SECRET || '';
  if (!secret) {
    console.warn("⚠️ No MERCHANT_WEBHOOK_SECRET or EFT_WEBHOOK_SECRET configured for legacy notifyUrl signing");
  }
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
