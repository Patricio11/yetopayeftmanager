import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { eftTransactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { dispatchWebhookEvent } from "@/lib/webhooks/dispatcher";

/**
 * POST /api/admin/transactions/[id]/resend-webhook
 * Resend webhook for a transaction (admin only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  try {
    const [transaction] = await db
      .select()
      .from(eftTransactions)
      .where(eq(eftTransactions.id, id))
      .limit(1);

    if (!transaction) {
      return NextResponse.json(
        { success: false, error: "Transaction not found" },
        { status: 404 }
      );
    }

    const status = transaction.status || "not_started";
    const eventType = status === "completed"
      ? "payment.completed"
      : status === "failed"
      ? "payment.failed"
      : status === "cancelled"
      ? "payment.cancelled"
      : "transaction.updated";

    await dispatchWebhookEvent(transaction.merchantId, eventType as any, {
      id: transaction.id,
      reference: transaction.reference,
      amount: transaction.amount,
      status,
      resent: true,
      resentBy: auth.session.user.email || auth.session.user.id,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: `Webhook dispatched for event: ${eventType}`,
    });
  } catch (error: any) {
    console.error("Error resending webhook:", error);
    return NextResponse.json(
      { success: false, error: "Failed to resend webhook" },
      { status: 500 }
    );
  }
}
