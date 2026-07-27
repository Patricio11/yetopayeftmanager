import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { eftTransactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getAuditFile } from "@/lib/eft-audit";

/**
 * GET /api/admin/transactions/[id]/audit/file?bucket=logs&date=YYYY-MM-DD&name=transaction.log
 * Streams one audit artifact from the (private) storage bucket through our server,
 * so the browser never talks to S3/Supabase directly — no CORS, no presigned URLs.
 * Admin only. The object key is pinned to the transaction the caller can access.
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
      columns: { id: true },
    });
    if (!transaction) {
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
  } catch (error: any) {
    console.error("Error streaming audit file:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch file", detail: error?.name || error?.message || String(error) }, { status: 500 });
  }
}
