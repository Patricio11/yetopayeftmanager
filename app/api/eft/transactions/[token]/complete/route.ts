import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { eftTransactions } from "@/lib/db/schema";
import { verifyPaymentToken } from "@/lib/security/payment-token";
import { eq } from "drizzle-orm";
import { z } from "zod";

const completeSchema = z.object({
  status: z.enum(["completed", "failed", "aborted", "cancelled", "expired"]),
  message: z.string().optional(),
  gatewayResult: z.string().optional(),
  transactionStatus: z.string().optional(),
  destinationAccount: z.string().optional(),
  destinationBank: z.string().optional(),
  customerBank: z.string().optional(),
  sessionId: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

/**
 * POST /api/eft/transactions/[token]/complete
 * Update transaction status when payment completes
 * Called by frontend when EFT service returns final status
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

    // Update transaction status
    const [updatedTransaction] = await db
      .update(eftTransactions)
      .set({
        status: validatedData.status,
        completedAt: validatedData.status === "completed" ? new Date() : null,
        updatedAt: new Date(),
        metadata: {
          ...(transaction.metadata as any || {}),
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

    // Forward to merchant's notify URL if configured
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
          },
          body: JSON.stringify(merchantWebhookPayload),
        }).catch((error) => {
          console.error(`❌ Error forwarding to merchant webhook: ${error.message}`);
        });

        console.log(`📤 Merchant webhook queued: ${transaction.notifyUrl}`);
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
