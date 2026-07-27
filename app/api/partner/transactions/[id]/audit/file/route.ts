import { NextRequest, NextResponse } from "next/server";
import { requirePartner } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { eftTransactions, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuditFile } from "@/lib/eft-audit";

/**
 * GET /api/partner/transactions/[id]/audit/file?bucket=&date=&name=
 * Streams one audit artifact for a transaction belonging to one of the partner's
 * own merchants through our server (private bucket, no CORS). Mirrors the audit
 * route's authorization.
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
    const partner = await db.query.users.findFirst({
      where: eq(users.id, partnerId),
      columns: { eftSettings: true },
    });
    if (!(partner?.eftSettings as any)?.auditEnabled) {
      return NextResponse.json({ success: false, message: "Audit access is not enabled." }, { status: 403 });
    }

    const transaction = await db.query.eftTransactions.findFirst({
      where: eq(eftTransactions.id, id),
      columns: { id: true, merchantId: true },
    });
    if (!transaction) {
      return NextResponse.json({ success: false, message: "Transaction not found" }, { status: 404 });
    }

    // Ownership: the transaction's merchant must belong to this partner.
    const merchant = await db.query.users.findFirst({
      where: and(eq(users.id, transaction.merchantId), eq(users.partnerId, partnerId)),
      columns: { id: true },
    });
    if (!merchant) {
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
    console.error("Error streaming partner audit file:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch file" }, { status: 500 });
  }
}
