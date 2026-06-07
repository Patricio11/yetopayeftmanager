import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { settlementBanks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  try {
    const body = await request.json();
    const updates: Record<string, any> = { updatedAt: new Date() };

    if (body.bankName !== undefined) updates.bankName = body.bankName;
    if (body.code !== undefined) updates.code = body.code;
    if (body.color !== undefined) updates.color = body.color;
    if (body.branchCode !== undefined) updates.branchCode = body.branchCode;
    if (typeof body.enabled === "boolean") updates.enabled = body.enabled;
    if (typeof body.displayOrder === "number") updates.displayOrder = body.displayOrder;

    const [updated] = await db
      .update(settlementBanks)
      .set(updates)
      .where(eq(settlementBanks.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ success: false, error: "Bank not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    if (error?.code === "23505") {
      return NextResponse.json({ success: false, error: "A bank with this code already exists" }, { status: 409 });
    }
    console.error("Error updating settlement bank:", error);
    return NextResponse.json({ success: false, error: "Failed to update bank" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  try {
    const [deleted] = await db
      .delete(settlementBanks)
      .where(eq(settlementBanks.id, id))
      .returning();

    if (!deleted) {
      return NextResponse.json({ success: false, error: "Bank not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.code === "23503") {
      return NextResponse.json({ success: false, error: "Cannot delete — bank is in use by merchant accounts" }, { status: 409 });
    }
    console.error("Error deleting settlement bank:", error);
    return NextResponse.json({ success: false, error: "Failed to delete bank" }, { status: 500 });
  }
}
