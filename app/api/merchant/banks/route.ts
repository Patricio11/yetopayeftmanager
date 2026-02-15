import { NextRequest, NextResponse } from "next/server";
import { requireMerchant } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { eftBanks } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

/**
 * GET /api/merchant/banks
 * List available banks for dropdown selection (enabled banks only)
 */
export async function GET(_request: NextRequest) {
  try {
    const auth = await requireMerchant();
    if (!auth.authorized) return auth.response;

    const banks = await db
      .select({
        id: eftBanks.id,
        bankName: eftBanks.bankName,
        code: eftBanks.code,
        color: eftBanks.color,
        branchCode: eftBanks.branchCode,
      })
      .from(eftBanks)
      .where(eq(eftBanks.enabled, true))
      .orderBy(asc(eftBanks.displayOrder));

    return NextResponse.json({ success: true, data: { banks } });
  } catch (error) {
    console.error("Error fetching banks:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch banks" },
      { status: 500 }
    );
  }
}
