import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { eftTransactions, eftBanks } from "@/lib/db/schema";
import { verifyPaymentToken } from "@/lib/security/payment-token";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { dispatchWebhookEvent } from "@/lib/webhooks/dispatcher";

const updateBankSchema = z.object({
  bankCode: z.string().min(1, "Bank code is required"),
});

/**
 * POST /api/eft/transactions/[token]/update-bank
 * Update transaction when bank is selected and payment initiated
 * Called by frontend when user selects a bank and starts payment
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
    const validatedData = updateBankSchema.parse(body);

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
        success: false,
        message: "Transaction already completed or cancelled",
      }, { status: 400 });
    }

    // Find the bank by code
    const bank = await db.query.eftBanks.findFirst({
      where: eq(eftBanks.code, validatedData.bankCode),
    });

    if (!bank) {
      return NextResponse.json(
        { success: false, message: "Invalid bank code" },
        { status: 400 }
      );
    }

    // Update transaction to initiated status with bank info
    const [updatedTransaction] = await db
      .update(eftTransactions)
      .set({
        status: "initiated",
        eftBankId: bank.id,
        updatedAt: new Date(),
        metadata: {
          ...(transaction.metadata as any || {}),
          bank_selected_at: new Date().toISOString(),
          bank_code: validatedData.bankCode,
          bank_name: bank.bankName,
        },
      })
      .where(eq(eftTransactions.id, transactionId))
      .returning();

    console.log(`✅ Transaction initiated: ${transactionId} -> Bank: ${bank.bankName} (${validatedData.bankCode})`);

    // Dispatch transaction.updated webhook event
    try {
      await dispatchWebhookEvent(
        transaction.merchantId,
        "transaction.updated",
        {
          id: updatedTransaction.id,
          reference: updatedTransaction.reference,
          amount: parseFloat(updatedTransaction.amount),
          status: updatedTransaction.status,
          customerEmail: updatedTransaction.customerEmail || undefined,
          customerName: updatedTransaction.customerName || undefined,
          bankName: bank.bankName,
          bankCode: validatedData.bankCode,
          metadata: updatedTransaction.metadata,
          createdAt: updatedTransaction.createdAt?.toISOString(),
          updatedAt: updatedTransaction.updatedAt?.toISOString(),
        }
      );
      console.log(`📤 Webhook dispatched: transaction.updated for ${transactionId}`);
    } catch (error) {
      console.error("❌ Error dispatching transaction.updated webhook:", error);
      // Don't fail the request if webhook dispatch fails
    }

    return NextResponse.json({
      success: true,
      message: "Transaction updated successfully",
      transaction: {
        id: updatedTransaction.id,
        status: updatedTransaction.status,
        reference: updatedTransaction.reference,
        amount: updatedTransaction.amount,
        bank: {
          id: bank.id,
          name: bank.bankName,
          code: validatedData.bankCode,
        },
      },
    });

  } catch (error: any) {
    console.error("❌ Error updating transaction bank:", error);

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
        message: "Failed to update transaction" 
      },
      { status: 500 }
    );
  }
}
