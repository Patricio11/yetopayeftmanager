import { NextRequest, NextResponse } from "next/server";
import { authenticateMerchant } from "@/lib/auth/merchant-auth";
import { db } from "@/lib/db";
import { eftTransactions, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getEffectiveMerchantId } from "@/lib/auth/team-permissions";
import { getTransactionAudit, auditStorageConfigured } from "@/lib/eft-audit";

/**
 * GET /api/merchant/transactions/[id]/audit
 * EFT session log + screenshots for one of the merchant's own transactions.
 * Requires the merchant to have audit access granted by an admin.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateMerchant(request, "transactions.read");
  if (!auth.success) return auth.response;

  const { id } = await params;

  try {
    const merchantId = await getEffectiveMerchantId(auth.merchantId);

    // Audit access is admin-granted and off by default
    const merchant = await db.query.users.findFirst({
      where: eq(users.id, merchantId),
      columns: { eftSettings: true },
    });
    if (!(merchant?.eftSettings as any)?.auditEnabled) {
      return NextResponse.json(
        { success: false, message: "Audit access is not enabled for your account. Contact your administrator." },
        { status: 403 }
      );
    }

    const transaction = await db.query.eftTransactions.findFirst({
      where: eq(eftTransactions.id, id),
      columns: { id: true, merchantId: true, createdAt: true, completedAt: true, updatedAt: true },
    });

    // Not found or not owned → 404 (don't reveal other merchants' transactions)
    if (!transaction || transaction.merchantId !== merchantId) {
      return NextResponse.json({ success: false, message: "Transaction not found" }, { status: 404 });
    }

    if (!auditStorageConfigured) {
      return NextResponse.json({ success: false, message: "Audit storage is not configured." }, { status: 500 });
    }

    const data = await getTransactionAudit(transaction);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error fetching merchant transaction audit:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch audit trail" }, { status: 500 });
  }
}
