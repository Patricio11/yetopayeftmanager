import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { eftTransactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getTransactionAudit, auditStorageConfigured } from "@/lib/eft-audit";

/**
 * GET /api/admin/transactions/[id]/audit
 * EFT session log + screenshots for any transaction. Admin only.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  try {
    const transaction = await db.query.eftTransactions.findFirst({
      where: eq(eftTransactions.id, id),
      columns: { id: true, createdAt: true, completedAt: true, updatedAt: true },
    });

    if (!transaction) {
      return NextResponse.json({ success: false, message: "Transaction not found" }, { status: 404 });
    }

    if (!(await auditStorageConfigured())) {
      return NextResponse.json(
        { success: false, message: "Audit storage is not configured. Configure and activate a provider in admin → Storage (or set the EFT_STORAGE_* env vars)." },
        { status: 500 }
      );
    }

    const data = await getTransactionAudit(transaction, `/api/admin/transactions/${id}/audit/file`);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error fetching transaction audit:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch audit trail" }, { status: 500 });
  }
}
