import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { eftInvoices, eftInvoiceItems } from "@/lib/db/schema";
import { getSession } from "@/lib/auth-server";
import { eq, and } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const invoice = await db.query.eftInvoices.findFirst({
      where: and(eq(eftInvoices.id, id), eq(eftInvoices.merchantId, session.user.id)),
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
