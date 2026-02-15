import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { eftTransactions, eftBanks, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { dispatchWebhookEvent } from "@/lib/webhooks/dispatcher";

const updateStatusSchema = z.object({
  status: z.enum(["not_started", "initiated", "pending", "completed", "failed", "aborted", "cancelled", "expired"]),
  reason: z.string().min(1, "Reason is required").max(500),
  resendWebhook: z.boolean().default(false),
});

/**
 * GET /api/admin/transactions/[id]
 * Get full transaction details (admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  try {
    const [result] = await db
      .select({
        transaction: eftTransactions,
        merchant: {
          id: users.id,
          name: users.name,
          email: users.email,
          companyName: users.companyName,
        },
        bank: {
          id: eftBanks.id,
          bankName: eftBanks.bankName,
          code: eftBanks.code,
        },
      })
      .from(eftTransactions)
      .leftJoin(users, eq(eftTransactions.merchantId, users.id))
      .leftJoin(eftBanks, eq(eftTransactions.eftBankId, eftBanks.id))
      .where(eq(eftTransactions.id, id))
      .limit(1);

    if (!result) {
      return NextResponse.json(
        { success: false, error: "Transaction not found" },
        { status: 404 }
      );
    }

    // Get the updatedBy user name if present
    let updatedByUser = null;
    if (result.transaction.updatedBy) {
      const [user] = await db
        .select({ name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, result.transaction.updatedBy))
        .limit(1);
      updatedByUser = user || null;
    }

    return NextResponse.json({
      success: true,
      data: { ...result, updatedByUser },
    });
  } catch (error: any) {
    console.error("Error fetching transaction:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch transaction" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/transactions/[id]
 * Update transaction status (admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  try {
    const body = await request.json();
    const { status, reason, resendWebhook } = updateStatusSchema.parse(body);

    // Fetch the transaction first
    const [existing] = await db
      .select()
      .from(eftTransactions)
      .where(eq(eftTransactions.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Transaction not found" },
        { status: 404 }
      );
    }

    const previousStatus = existing.status;

    // Update transaction
    const [updated] = await db
      .update(eftTransactions)
      .set({
        status,
        statusReason: reason,
        updatedBy: auth.session.user.id,
        updatedAt: new Date(),
        completedAt: status === "completed" ? new Date() : existing.completedAt,
      })
      .where(eq(eftTransactions.id, id))
      .returning();

    // Dispatch webhook if requested
    if (resendWebhook) {
      const eventType = status === "completed"
        ? "payment.completed"
        : status === "failed"
        ? "payment.failed"
        : status === "cancelled"
        ? "payment.cancelled"
        : "transaction.updated";

      await dispatchWebhookEvent(existing.merchantId, eventType as any, {
        id: existing.id,
        reference: existing.reference,
        amount: existing.amount,
        status,
        previousStatus,
        reason,
        updatedBy: auth.session.user.email || auth.session.user.id,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Transaction status updated to ${status}${resendWebhook ? " and webhook dispatched" : ""}`,
    });
  } catch (error: any) {
    console.error("Error updating transaction:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Failed to update transaction" },
      { status: 500 }
    );
  }
}
