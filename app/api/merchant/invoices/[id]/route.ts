import { NextRequest, NextResponse } from "next/server";
import { requireMerchant } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { eftInvoices, eftInvoiceItems } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireMerchant();
    if (!auth.authorized) return auth.response;

    const { id } = await params;

    const invoice = await db.query.eftInvoices.findFirst({
      where: and(eq(eftInvoices.id, id), eq(eftInvoices.merchantId, auth.session.user.id)),
    });

    if (!invoice) {
      return NextResponse.json({ success: false, message: "Invoice not found" }, { status: 404 });
    }

    const items = await db.select().from(eftInvoiceItems).where(eq(eftInvoiceItems.invoiceId, id));

    return NextResponse.json({ success: true, data: { ...invoice, items } });
  } catch (error: any) {
    console.error("Error fetching invoice:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
