import { NextRequest, NextResponse } from "next/server";
import { authenticateMerchant } from "@/lib/auth/merchant-auth";
import { db } from "@/lib/db";
import { eftBanks } from "@/lib/db/schema";
import { eq, asc, and } from "drizzle-orm";

/**
 * GET /api/merchant/banks
 * List available banks for dropdown selection (enabled banks only).
 * Supports both session and API key authentication.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateMerchant(request, 'banks.read');
    if (!auth.success) return auth.response;

    // Optional ?currency=NAD filter — e.g. to list the banks a NAD payment
    // link would show. Omitted → all enabled banks (currency is per bank).
    const currencyFilter = request.nextUrl.searchParams.get("currency")?.toUpperCase() || null;

    const banks = await db
      .select({
        id: eftBanks.id,
        bankName: eftBanks.bankName,
        code: eftBanks.code,
        color: eftBanks.color,
        branchCode: eftBanks.branchCode,
        currency: eftBanks.currency,
      })
      .from(eftBanks)
      .where(
        currencyFilter
          ? and(eq(eftBanks.enabled, true), eq(eftBanks.currency, currencyFilter))
          : eq(eftBanks.enabled, true)
      )
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
