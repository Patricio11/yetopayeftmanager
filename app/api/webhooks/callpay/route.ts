import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { eftTransactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getProviderConfig, asCallPayConfig } from "@/lib/providers";
import { verifyWebhookIp, mapCallPayStatus, getTransaction } from "@/lib/providers/callpay";
import type { CallPayWebhookPayload } from "@/lib/providers/callpay";

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "";

    const providerInfo = await getProviderConfig("card");
    if (!providerInfo) {
      console.error("CallPay webhook received but service not configured");
      return NextResponse.json({ error: "Service not configured" }, { status: 503 });
    }

    const config = asCallPayConfig(providerInfo.config);

    if (!verifyWebhookIp(ip, config)) {
      console.error(`CallPay webhook rejected: IP ${ip} not whitelisted`);
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const payload: CallPayWebhookPayload = {
      success: formData.get("success") as string || "0",
      status: formData.get("status") as string || "",
      organisation_id: formData.get("organisation_id") as string || "",
      amount: formData.get("amount") as string || "0",
      callpay_transaction_id: formData.get("callpay_transaction_id") as string || "",
      reason: formData.get("reason") as string || undefined,
      user: formData.get("user") as string || undefined,
      merchant_reference: formData.get("merchant_reference") as string || "",
      gateway_reference: formData.get("gateway_reference") as string || undefined,
      gateway_response: formData.get("gateway_response") as string || undefined,
      currency: formData.get("currency") as string || undefined,
      payment_key: formData.get("payment_key") as string || undefined,
    };

    if (!payload.merchant_reference) {
      return NextResponse.json({ error: "Missing merchant_reference" }, { status: 400 });
    }

    const [transaction] = await db
      .select()
      .from(eftTransactions)
      .where(eq(eftTransactions.reference, payload.merchant_reference));

    if (!transaction) {
      console.error(`CallPay webhook: no transaction for reference ${payload.merchant_reference}`);
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    if (transaction.status === "completed" || transaction.status === "failed") {
      return NextResponse.json({ success: true, message: "Already processed" });
    }

    // Verify with CallPay API for extra security
    let verified = false;
    if (payload.callpay_transaction_id) {
      try {
        const gatewayTx = await getTransaction(config, payload.callpay_transaction_id);
        verified = true;

        if (gatewayTx.amount && String(gatewayTx.amount) !== String(transaction.amount)) {
          console.error(
            `CallPay amount mismatch: expected ${transaction.amount}, got ${gatewayTx.amount}`
          );
          return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
        }
      } catch (err) {
        console.error("CallPay transaction verification failed:", err);
      }
    }

    const newStatus = mapCallPayStatus(payload.status, payload.success);

    await db
      .update(eftTransactions)
      .set({
        status: newStatus as any,
        completedAt: newStatus === "completed" ? new Date() : null,
        providerTransactionId: payload.callpay_transaction_id || null,
        providerData: {
          callpay_status: payload.status,
          gateway_reference: payload.gateway_reference,
          gateway_response: payload.gateway_response,
          payment_key: payload.payment_key,
          reason: payload.reason,
          currency: payload.currency,
          verified,
          webhook_received_at: new Date().toISOString(),
        },
        failureReason: newStatus === "failed" ? (payload.reason || payload.status) : null,
        updatedAt: new Date(),
      })
      .where(eq(eftTransactions.id, transaction.id));

    // TODO: dispatch merchant webhook (same pattern as EFT webhooks)

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("CallPay webhook error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
