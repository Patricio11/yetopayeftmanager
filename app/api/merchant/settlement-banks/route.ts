import { NextRequest, NextResponse } from "next/server";
import { authenticateMerchant } from "@/lib/auth/merchant-auth";
import { db } from "@/lib/db";
import { settlementBanks } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateMerchant(request, 'banks.read');
    if (!auth.success) return auth.response;

    const banks = await db
      .select({
        id: settlementBanks.id,
        bankName: settlementBanks.bankName,
        code: settlementBanks.code,
        color: settlementBanks.color,
        branchCode: settlementBanks.branchCode,
      })
      .from(settlementBanks)
      .where(eq(settlementBanks.enabled, true))
      .orderBy(asc(settlementBanks.displayOrder));

    return NextResponse.json({ success: true, data: { banks } });
  } catch (error) {
    console.error("Error fetching settlement banks:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch banks" }, { status: 500 });
  }
}
