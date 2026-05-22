import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { paymentServices } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { writeAuditLog } from "@/lib/audit";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  try {
    const [service] = await db
      .select()
      .from(paymentServices)
      .where(eq(paymentServices.id, id));

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: service });
  } catch (error: any) {
    console.error("Error fetching service:", error);
    return NextResponse.json({ error: "Failed to fetch service" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  try {
    const [existing] = await db
      .select()
      .from(paymentServices)
      .where(eq(paymentServices.id, id));

    if (!existing) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const body = await request.json();
    const updates: Record<string, any> = { updatedAt: new Date() };

    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.icon !== undefined) updates.icon = body.icon;
    if (body.isActive !== undefined) updates.isActive = body.isActive;
    if (body.displayOrder !== undefined) updates.displayOrder = body.displayOrder;
    if (body.requiresSetup !== undefined) updates.requiresSetup = body.requiresSetup;
    if (body.metadata !== undefined) updates.metadata = body.metadata;

    if (body.providerConfig !== undefined) {
      updates.providerConfig = {
        ...(existing.providerConfig as Record<string, any> || {}),
        ...body.providerConfig,
      };
    }

    const [updated] = await db
      .update(paymentServices)
      .set(updates)
      .where(eq(paymentServices.id, id))
      .returning();

    writeAuditLog({
      userId: auth.session.user.id,
      action: "update",
      resource: "payment_service",
      resourceId: id,
      changes: {
        before: { isActive: existing.isActive, name: existing.name },
        after: { isActive: updated.isActive, name: updated.name },
      },
      request,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Error updating service:", error);
    return NextResponse.json({ error: "Failed to update service" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  try {
    const [existing] = await db
      .select()
      .from(paymentServices)
      .where(eq(paymentServices.id, id));

    if (!existing) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    // Don't allow deleting internal services — disable them instead
    if (existing.provider === "internal") {
      return NextResponse.json(
        { error: "Cannot delete internal services. Disable them instead." },
        { status: 400 }
      );
    }

    await db.delete(paymentServices).where(eq(paymentServices.id, id));

    writeAuditLog({
      userId: auth.session.user.id,
      action: "delete",
      resource: "payment_service",
      resourceId: id,
      changes: { before: { code: existing.code, name: existing.name } },
      request,
    });

    return NextResponse.json({ success: true, message: "Service deleted" });
  } catch (error: any) {
    console.error("Error deleting service:", error);
    return NextResponse.json({ error: "Failed to delete service" }, { status: 500 });
  }
}
