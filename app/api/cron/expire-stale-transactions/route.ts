import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { eftTransactions } from "@/lib/db/schema";
import { and, inArray, lt, eq, sql } from "drizzle-orm";
import { dispatchWebhookEvent } from "@/lib/webhooks/dispatcher";

/**
 * GET /api/cron/expire-stale-transactions
 *
 * Safety net for transactions the payment page could never report on
 * (closed tab, crashed device, dead EFT session): nothing may stay
 * "initiated"/"pending" forever — partners polling those statuses see a
 * payment that is permanently "busy".
 *
 * - initiated/pending untouched for STALE_MINUTES → failed (+ payment.failed
 *   webhook with the reason). The EFT service reaps its browser session after
 *   20 idle minutes, so by 45 minutes the payment demonstrably cannot finish.
 *   If a signed completion arrives later anyway, /complete upgrades
 *   failed → completed, so this can never destroy a real payment.
 * - not_started older than LINK_TTL_HOURS → expired, quietly (the customer
 *   never engaged; webhooking every abandoned/bot-created link is noise).
 *
 * Protected by CRON_SECRET (same convention as webhook-retries).
 */

const STALE_MINUTES = 45;
const LINK_TTL_HOURS = 24;
const STALE_REASON =
  "Payment session timed out — no completion received from the payment page";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const staleCutoff = new Date(Date.now() - STALE_MINUTES * 60 * 1000);
    const linkCutoff = new Date(Date.now() - LINK_TTL_HOURS * 60 * 60 * 1000);

    // In-flight transactions that went silent: fail them with a reason.
    const failed = await db
      .update(eftTransactions)
      .set({
        status: "failed",
        statusReason: STALE_REASON,
        updatedAt: new Date(),
        metadata: sql`COALESCE(${eftTransactions.metadata}, '{}'::jsonb) || '{"status_source":"stale_reaper"}'::jsonb`,
      })
      .where(
        and(
          inArray(eftTransactions.status, ["initiated", "pending"]),
          lt(eftTransactions.updatedAt, staleCutoff)
        )
      )
      .returning();

    // Tell the merchant's webhooks — this is what unblocks a partner stuck
    // on "busy". Sequential on purpose: the batch is normally tiny.
    let webhooksSent = 0;
    for (const txn of failed) {
      try {
        await dispatchWebhookEvent(txn.merchantId, "payment.failed", {
          id: txn.id,
          reference: txn.reference,
          amount: parseFloat(txn.amount),
          status: "failed",
          customerEmail: txn.customerEmail || undefined,
          customerName: txn.customerName || undefined,
          customer: {
            name: txn.customerName || undefined,
            account: txn.customerAccount || undefined,
            account_type: txn.customerAccountType || undefined,
            bank: txn.customerBank || undefined,
            branch_code: txn.customerBranchCode || undefined,
          },
          metadata: txn.metadata,
          createdAt: txn.createdAt?.toISOString(),
          message: STALE_REASON,
          reason: "timeout",
        });
        webhooksSent++;
      } catch (err) {
        console.error(`Stale reaper: webhook dispatch failed for ${txn.id}`, err);
      }
    }

    // Links nobody ever opened: expire quietly.
    const expired = await db
      .update(eftTransactions)
      .set({
        status: "expired",
        statusReason: "Payment link expired — never started",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(eftTransactions.status, "not_started"),
          lt(eftTransactions.createdAt, linkCutoff)
        )
      )
      .returning({ id: eftTransactions.id });

    if (failed.length || expired.length) {
      console.log(
        `Stale reaper: failed ${failed.length} silent transaction(s) (${webhooksSent} webhook(s) sent), expired ${expired.length} untouched link(s)`
      );
    }

    return NextResponse.json({
      success: true,
      failedStale: failed.length,
      webhooksSent,
      expiredLinks: expired.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Cron expire-stale-transactions error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
