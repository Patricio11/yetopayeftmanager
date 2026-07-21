import { NextRequest, NextResponse } from "next/server";
import { requirePartner } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { eftTransactions, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getTransactionAudit, auditStorageConfigured } from "@/lib/eft-audit";

/**
 * GET /api/partner/transactions/[id]/audit
 * EFT session log + screenshots for a transaction — restricted to
 * transactions belonging to one of the partner's own merchants.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePartner();
  if (!auth.authorized) return auth.response;
  const partnerId = auth.session.user.id;

  const { id } = await params;

  try {
    const transaction = await db.query.eftTransactions.findFirst({
      where: eq(eftTransactions.id, id),
      columns: { id: true, merchantId: true, createdAt: true, completedAt: true, updatedAt: true },
    });

    if (!transaction) {
      return NextResponse.json({ success: false, message: "Transaction not found" }, { status: 404 });
    }

    // Ownership: the transaction's merchant must belong to this partner
    const merchant = await db.query.users.findFirst({
      where: and(eq(users.id, transaction.merchantId), eq(users.partnerId, partnerId)),
      columns: { id: true },
    });

    if (!merchant) {
      return NextResponse.json({ success: false, message: "Transaction not found" }, { status: 404 });
    }

    if (!auditStorageConfigured) {
      return NextResponse.json(
        { success: false, message: "Audit storage is not configured." },
        { status: 500 }
      );
    }

    const data = await getTransactionAudit(transaction);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error fetching partner transaction audit:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch audit trail" }, { status: 500 });
  }
}
