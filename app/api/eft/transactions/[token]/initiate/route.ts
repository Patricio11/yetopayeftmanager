import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { eftTransactions, eftBanks } from "@/lib/db/schema";
import { verifyPaymentToken } from "@/lib/security/payment-token";
import { eq } from "drizzle-orm";
import { dispatchWebhookEvent } from "@/lib/webhooks/dispatcher";

/**
 * POST /api/eft/transactions/[token]/initiate
 * Mark the transaction as initiated — called when the customer has selected
 * their bank, entered their login details, and submitted. This is the moment
 * the payment attempt actually starts, and it fires the payment.initiated
 * webhook so integrators (e.g. partner connectors) know the customer engaged.
 * Idempotent: repeat calls (captcha retries etc.) are no-ops.
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

    const ipAddress = request.headers.get("x-forwarded-for") ||
                     request.headers.get("x-real-ip") ||
                     "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    const { transactionId } = await verifyPaymentToken(token, ipAddress, userAgent);

    const transaction = await db.query.eftTransactions.findFirst({
      where: eq(eftTransactions.id, transactionId),
    });

    if (!transaction) {
      return NextResponse.json(
        { success: false, message: "Transaction not found" },
        { status: 404 }
      );
    }

    // Idempotent: already initiated (or further along) — nothing to do
    if (transaction.status !== "not_started") {
      return NextResponse.json({
        success: true,
        message: "Transaction already initiated",
        status: transaction.status,
      });
    }

    const [updatedTransaction] = await db
      .update(eftTransactions)
      .set({
        status: "initiated",
        updatedAt: new Date(),
        metadata: {
          ...(transaction.metadata as any || {}),
          initiated_at: new Date().toISOString(),
        },
      })
      .where(eq(eftTransactions.id, transactionId))
      .returning();

    console.log(`✅ Transaction initiated (credentials submitted): ${transactionId}`);

    // Fire payment.initiated webhook
    try {
      const bank = transaction.eftBankId
        ? await db.query.eftBanks.findFirst({ where: eq(eftBanks.id, transaction.eftBankId) })
        : null;

      await dispatchWebhookEvent(transaction.merchantId, "payment.initiated", {
        id: updatedTransaction.id,
        reference: updatedTransaction.reference,
        amount: parseFloat(updatedTransaction.amount),
        status: updatedTransaction.status,
        customerEmail: updatedTransaction.customerEmail || undefined,
        customerName: updatedTransaction.customerName || undefined,
        bankName: bank?.bankName,
        bankCode: bank?.code,
        metadata: updatedTransaction.metadata,
        createdAt: updatedTransaction.createdAt?.toISOString(),
        initiatedAt: new Date().toISOString(),
      });
      console.log(`📤 Webhook dispatched: payment.initiated for ${transactionId}`);
    } catch (error) {
      console.error("❌ Error dispatching payment.initiated webhook:", error);
      // Don't fail the request if webhook dispatch fails
    }

    return NextResponse.json({
      success: true,
      message: "Transaction initiated",
      status: updatedTransaction.status,
    });
  } catch (error: any) {
    console.error("❌ Error initiating transaction:", error);

    if (error.message === "Invalid or expired token") {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to initiate transaction" },
      { status: 500 }
    );
  }
}
