import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { eftTransactions } from "@/lib/db/schema";
import { verifyPaymentToken } from "@/lib/security/payment-token";
import { eq } from "drizzle-orm";
import { z } from "zod";
import crypto from "crypto";
import { dispatchWebhookEvent } from "@/lib/webhooks/dispatcher";
import { checkBankHealth } from "@/lib/monitoring/bank-health";

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

const completeSchema = z.object({
  status: z.enum(["pending", "completed", "failed", "aborted", "cancelled", "expired"]),
  message: z.string().optional(),
  gatewayResult: z.string().optional(),
  transactionStatus: z.string().optional(),
  destinationAccount: z.string().optional(),
  destinationBank: z.string().optional(),
  customerBank: z.string().optional(),
  sessionId: z.string().optional(),
  eftSignature: z.string().optional(), // Required when status is "completed" — signed by EFT service
  metadata: z.record(z.string(), z.any()).optional(),
});

/**
 * Verify the EFT service signature that proves the payment was genuinely completed.
 * The EFT service signs: HMAC-SHA256(secret, transactionId|amount|reference|completed)
 * and returns this signature to the frontend on redirect.
 */
function verifyEftServiceSignature(
  signature: string,
  transactionId: string,
  amount: string,
  reference: string
): boolean {
  const secret = process.env.EFT_WEBHOOK_SECRET;
  if (!secret) {
    console.error("❌ EFT_WEBHOOK_SECRET not configured — cannot verify EFT signature");
    return false;
  }

  const payload = `${transactionId}|${amount}|${reference}|completed`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  // Constant-time comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}

/**
 * POST /api/eft/transactions/[token]/complete
 * Update transaction status when payment flow ends.
 *
 * - "completed": REQUIRES a valid eftSignature from the EFT service.
 *   The EFT service signs the result on redirect so the frontend can
 *   relay it here. Without a valid signature, "completed" is rejected.
 * - "failed"/"aborted"/"cancelled"/"expired": Allowed directly from
 *   frontend (user cancelled, timed out, etc.).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Token is required" },
        { status: 400 }
      );
    }

    // Get IP and User Agent for security tracking
    const ipAddress = request.headers.get("x-forwarded-for") || 
                     request.headers.get("x-real-ip") || 
                     "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    // Verify payment token
    const { transactionId } = await verifyPaymentToken(
      token,
      ipAddress,
      userAgent
    );

    // Parse and validate request body
    const body = await request.json();
    const validatedData = completeSchema.parse(body);

    // Fetch transaction
    const transaction = await db.query.eftTransactions.findFirst({
      where: eq(eftTransactions.id, transactionId),
    });

    if (!transaction) {
      return NextResponse.json(
        { success: false, message: "Transaction not found" },
        { status: 404 }
      );
    }

    // Check if transaction is already in final state
    if (["completed", "failed", "aborted", "cancelled", "expired"].includes(transaction.status || "")) {
      console.log(`⚠️ Transaction already in final state: ${transaction.status}`);
      return NextResponse.json({
        success: true,
        message: "Transaction already in final state",
        transaction: {
          id: transaction.id,
          status: transaction.status,
          reference: transaction.reference,
          amount: transaction.amount,
        },
      });
    }

    // Validate status transitions — prevent going backward or skipping states
    const VALID_TRANSITIONS: Record<string, string[]> = {
      not_started: ["initiated", "pending", "cancelled", "expired"],
      initiated: ["pending", "completed", "failed", "aborted", "cancelled", "expired"],
      pending: ["completed", "failed", "aborted", "cancelled", "expired"],
    };
    const currentStatus = transaction.status || "not_started";
    const allowedNext = VALID_TRANSITIONS[currentStatus];
    if (allowedNext && !allowedNext.includes(validatedData.status)) {
      console.error(`❌ Invalid status transition: ${currentStatus} -> ${validatedData.status} for ${transactionId}`);
      return NextResponse.json(
        { success: false, message: `Cannot transition from '${currentStatus}' to '${validatedData.status}'` },
        { status: 400 }
      );
    }

    // "completed" requires a valid EFT service signature to prevent forgery (skip for demo transactions)
    if (validatedData.status === "completed" && !transaction.isDemo) {
      if (!validatedData.eftSignature) {
        console.error(`❌ Missing eftSignature for completed status on ${transactionId}`);
        return NextResponse.json(
          { success: false, message: "EFT service signature is required to mark payment as completed" },
          { status: 403 }
        );
      }

      const signatureValid = verifyEftServiceSignature(
        validatedData.eftSignature,
        transactionId,
        transaction.amount,
        transaction.reference
      );

      if (!signatureValid) {
        console.error(`❌ Invalid eftSignature for completed status on ${transactionId}`);
        return NextResponse.json(
          { success: false, message: "Invalid EFT service signature" },
          { status: 403 }
        );
      }

      console.log(`✅ EFT signature verified for completion: ${transactionId}`);
    }

    // Log unsigned status changes for security monitoring
    if (validatedData.status !== "completed" && !transaction.isDemo) {
      console.warn(`⚠️ [SECURITY] Unsigned status change: ${transactionId} -> ${validatedData.status} from IP ${ipAddress}`);
    }

    if (transaction.isDemo) {
      console.log(`🧪 Demo transaction completion: ${transactionId} -> ${validatedData.status}`);
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
          ...(transaction.isDemo ? { demo: true } : {}),
          status_source: validatedData.eftSignature ? "eft_service_signed" : "frontend_unsigned",
          status_source_ip: ipAddress,
          frontend_completed_at: new Date().toISOString(),
          gateway_result: validatedData.gatewayResult,
          transaction_status: validatedData.transactionStatus,
          destination_account: validatedData.destinationAccount,
          destination_bank: validatedData.destinationBank,
          customer_bank: validatedData.customerBank,
          session_id: validatedData.sessionId,
          completion_message: validatedData.message,
          ...(validatedData.metadata || {}),
        },
      })
      .where(eq(eftTransactions.id, transactionId))
      .returning();

    console.log(`✅ Transaction updated via frontend: ${transactionId} -> ${validatedData.status}`);

    // Fire-and-forget bank health check
    checkBankHealth(updatedTransaction.eftBankId, validatedData.status).catch(() => {});

    // Dispatch webhook events based on status
    try {
      const webhookEventData = {
        id: updatedTransaction.id,
        reference: updatedTransaction.reference,
        amount: parseFloat(updatedTransaction.amount),
        status: updatedTransaction.status,
        customerEmail: updatedTransaction.customerEmail || undefined,
        customerName: updatedTransaction.customerName || undefined,
        bankName: validatedData.customerBank,
        metadata: updatedTransaction.metadata,
        createdAt: updatedTransaction.createdAt?.toISOString(),
        completedAt: updatedTransaction.completedAt?.toISOString(),
        message: validatedData.message,
        gatewayResult: validatedData.gatewayResult,
      };

      // Dispatch appropriate webhook event based on status
      if (validatedData.status === "completed") {
        await dispatchWebhookEvent(
          transaction.merchantId,
          "payment.completed",
          webhookEventData
        );
        console.log(`📤 Webhook dispatched: payment.completed for ${transactionId}`);
      } else if (validatedData.status === "failed") {
        await dispatchWebhookEvent(
          transaction.merchantId,
          "payment.failed",
          webhookEventData
        );
        console.log(`📤 Webhook dispatched: payment.failed for ${transactionId}`);
      } else if (validatedData.status === "cancelled" || validatedData.status === "aborted") {
        // Both 'cancelled' (user cancelled) and 'aborted' (system/timeout) trigger payment.cancelled
        await dispatchWebhookEvent(
          transaction.merchantId,
          "payment.cancelled",
          webhookEventData
        );
        console.log(`📤 Webhook dispatched: payment.cancelled for ${transactionId} (status: ${validatedData.status})`);
      } else if (validatedData.status === "expired") {
        // Payment link expired before completion
        await dispatchWebhookEvent(
          transaction.merchantId,
          "payment.failed",
          {
            ...webhookEventData,
            message: "Payment link expired",
            reason: "expired"
          }
        );
        console.log(`📤 Webhook dispatched: payment.failed for ${transactionId} (expired)`);
      }
    } catch (error) {
      console.error("❌ Error dispatching webhook event:", error);
      // Don't fail the request if webhook dispatch fails
    }

    // Forward to merchant's notify URL if configured (legacy support)
    if (transaction.notifyUrl) {
      try {
        const merchantWebhookPayload = {
          transaction_id: transactionId,
          reference: transaction.reference,
          amount: parseFloat(transaction.amount),
          status: validatedData.status,
          timestamp: new Date().toISOString(),
          gateway_result: validatedData.gatewayResult,
          message: validatedData.message,
        };

        // Fire and forget - don't wait for merchant webhook
        fetch(transaction.notifyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-YetoPay-Signature': generateMerchantSignature(merchantWebhookPayload),
          },
          body: JSON.stringify(merchantWebhookPayload),
        }).catch((error) => {
          console.error(`❌ Error forwarding to merchant webhook: ${error.message}`);
        });

        console.log(`📤 Legacy merchant webhook queued: ${transaction.notifyUrl}`);
      } catch (error) {
        console.error("❌ Error preparing merchant webhook:", error);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Transaction status updated successfully",
      transaction: {
        id: updatedTransaction.id,
        status: updatedTransaction.status,
        reference: updatedTransaction.reference,
        amount: updatedTransaction.amount,
        completedAt: updatedTransaction.completedAt,
      },
    });

  } catch (error: any) {
    console.error("❌ Error completing transaction:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false,
          message: "Invalid request data",
          details: error.issues 
        },
        { status: 400 }
      );
    }

    if (error.message === "Invalid or expired token") {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { 
        success: false,
        message: "Failed to update transaction status" 
      },
      { status: 500 }
    );
  }
}
