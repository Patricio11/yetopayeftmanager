import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { eftInvoices, eftInvoiceItems, users } from "@/lib/db/schema";
import { getSession } from "@/lib/auth-server";
import { eq } from "drizzle-orm";

// GET /api/admin/recon/invoices/[id] — get invoice detail with items
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;

    const invoice = await db.query.eftInvoices.findFirst({
      where: eq(eftInvoices.id, id),
    });

    if (!invoice) {
      return NextResponse.json({ success: false, message: "Invoice not found" }, { status: 404 });
    }

    // Get items
    const items = await db
      .select()
      .from(eftInvoiceItems)
      .where(eq(eftInvoiceItems.invoiceId, id));

    // Get merchant
    const merchant = await db.query.users.findFirst({
      where: eq(users.id, invoice.merchantId),
    });

    return NextResponse.json({
      success: true,
      data: {
        ...invoice,
        items,
        merchantName: merchant?.companyName || merchant?.name,
        merchantEmail: merchant?.email,
        merchantPhone: merchant?.phone,
        merchantAddress: merchant?.address,
      },
    });
  } catch (error: any) {
    console.error("Error fetching invoice:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// PATCH /api/admin/recon/invoices/[id] — update invoice status/notes
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, notes, dueDate } = body;

    const updateData: Record<string, any> = { updatedAt: new Date() };

    if (status) {
      updateData.status = status;
      if (status === "paid") updateData.paidAt = new Date();
      if (status === "sent") updateData.sentAt = new Date();
    }
    if (notes !== undefined) updateData.notes = notes;
    if (dueDate) updateData.dueDate = new Date(dueDate);

    const [updated] = await db
      .update(eftInvoices)
      .set(updateData)
      .where(eq(eftInvoices.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ success: false, message: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Error updating invoice:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// DELETE /api/admin/recon/invoices/[id] — delete draft invoice
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;

    const invoice = await db.query.eftInvoices.findFirst({
      where: eq(eftInvoices.id, id),
    });

    if (!invoice) {
      return NextResponse.json({ success: false, message: "Invoice not found" }, { status: 404 });
    }

    if (invoice.status !== "draft") {
      return NextResponse.json(
        { success: false, message: "Only draft invoices can be deleted" },
        { status: 400 }
      );
    }

    // Items cascade-delete
    await db.delete(eftInvoices).where(eq(eftInvoices.id, id));

    return NextResponse.json({ success: true, message: "Invoice deleted" });
  } catch (error: any) {
    console.error("Error deleting invoice:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
