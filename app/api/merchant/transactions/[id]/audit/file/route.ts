import { NextRequest, NextResponse } from "next/server";
import { authenticateMerchant } from "@/lib/auth/merchant-auth";
import { db } from "@/lib/db";
import { eftTransactions, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getEffectiveMerchantId } from "@/lib/auth/team-permissions";
import { getAuditFile } from "@/lib/eft-audit";

/**
 * GET /api/merchant/transactions/[id]/audit/file?bucket=&date=&name=
 * Streams one audit artifact for one of the merchant's own transactions through
 * our server (private bucket, no CORS). Mirrors the audit route's authorization.
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

    const merchant = await db.query.users.findFirst({
      where: eq(users.id, merchantId),
      columns: { eftSettings: true },
    });
    if (!(merchant?.eftSettings as any)?.auditEnabled) {
      return NextResponse.json({ success: false, message: "Audit access is not enabled." }, { status: 403 });
    }

    const transaction = await db.query.eftTransactions.findFirst({
      where: eq(eftTransactions.id, id),
      columns: { id: true, merchantId: true },
    });
    if (!transaction || transaction.merchantId !== merchantId) {
      return NextResponse.json({ success: false, message: "Transaction not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const file = await getAuditFile(transaction, {
      bucket: searchParams.get("bucket") || "",
      date: searchParams.get("date") || "",
      name: searchParams.get("name") || "",
    });
    if (!file) {
      return NextResponse.json({ success: false, message: "File not found" }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(file.buffer), {
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `inline; filename="${file.name}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error streaming merchant audit file:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch file" }, { status: 500 });
  }
}
