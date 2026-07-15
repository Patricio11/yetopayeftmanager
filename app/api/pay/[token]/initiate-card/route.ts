import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { eftTransactions, paymentTokens } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createHash } from "crypto";
import { getProviderConfig, asCallPayConfig } from "@/lib/providers";
import { createPaymentKey } from "@/lib/providers/callpay";
import { dispatchWebhookEvent } from "@/lib/webhooks/dispatcher";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const tokenHash = createHash("sha256").update(token).digest("hex");

    const [paymentToken] = await db
      .select()
      .from(paymentTokens)
      .where(eq(paymentTokens.tokenHash, tokenHash));

    if (!paymentToken) {
      return NextResponse.json({ error: "Invalid payment token" }, { status: 404 });
    }

    if (paymentToken.isRevoked) {
      return NextResponse.json({ error: "Payment link revoked" }, { status: 410 });
    }

    if (paymentToken.expiresAt < new Date()) {
      return NextResponse.json({ error: "Payment link expired" }, { status: 410 });
    }

    const [transaction] = await db
      .select()
      .from(eftTransactions)
      .where(eq(eftTransactions.id, paymentToken.transactionId));

    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    if (transaction.status === "completed") {
      return NextResponse.json({ error: "Payment already completed" }, { status: 400 });
    }

    const providerInfo = await getProviderConfig("card");
    if (!providerInfo) {
      return NextResponse.json({ error: "Card payments not available" }, { status: 503 });
    }

    const config = asCallPayConfig(providerInfo.config);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const paymentKeyResponse = await createPaymentKey(config, {
      amount: String(transaction.amount),
      merchantReference: transaction.reference,
      paymentType: "credit_card",
      successUrl: `${appUrl}/pay/${token}?card_status=success`,
      errorUrl: `${appUrl}/pay/${token}?card_status=error`,
      cancelUrl: `${appUrl}/pay/${token}?card_status=cancelled`,
      customerEmail: transaction.customerEmail || undefined,
    });

    await db
      .update(eftTransactions)
      .set({
        paymentMethod: "card",
        status: "initiated",
        providerData: {
          payment_key: paymentKeyResponse.key,
          redirect_url: paymentKeyResponse.url,
          initiated_at: new Date().toISOString(),
        },
        updatedAt: new Date(),
      })
      .where(eq(eftTransactions.id, transaction.id));

    // Fire payment.initiated — the customer chose card and is being sent to
    // the card processor (only on the first initiation, not retries)
    if (transaction.status === "not_started") {
      try {
        await dispatchWebhookEvent(transaction.merchantId, "payment.initiated", {
          id: transaction.id,
          reference: transaction.reference,
          amount: parseFloat(transaction.amount),
          status: "initiated",
          paymentMethod: "card",
          customerEmail: transaction.customerEmail || undefined,
          customerName: transaction.customerName || undefined,
          metadata: transaction.metadata,
          createdAt: transaction.createdAt?.toISOString(),
          initiatedAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Error dispatching payment.initiated webhook:", error);
      }
    }

    return NextResponse.json({
      success: true,
      redirectUrl: paymentKeyResponse.url,
      paymentKey: paymentKeyResponse.key,
    });
  } catch (error: any) {
    console.error("Error initiating card payment:", error);
    return NextResponse.json(
      { error: error.message || "Failed to initiate card payment" },
      { status: 500 }
    );
  }
}
