import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { paymentServices, eftSystemFees } from "@/lib/db/schema";
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
    const [service] = await db.select().from(paymentServices).where(eq(paymentServices.id, id));
    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const [fees] = await db
      .select()
      .from(eftSystemFees)
      .where(eq(eftSystemFees.serviceName, service.code));

    return NextResponse.json({
      success: true,
      data: fees || {
        serviceName: service.code,
        fixedFeeValue: "5.00",
        percentageFeeValue: "2.50",
        volumeFeeValue: "2.00",
        vatEnabled: true,
        vatRate: "15.00",
      },
    });
  } catch (error: any) {
    console.error("Error fetching service fees:", error);
    return NextResponse.json({ error: "Failed to fetch fees" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  try {
    const [service] = await db.select().from(paymentServices).where(eq(paymentServices.id, id));
    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const body = await request.json();
    const { fixedFeeValue, percentageFeeValue, volumeFeeValue, vatEnabled, vatRate } = body;

    const [existing] = await db
      .select()
      .from(eftSystemFees)
      .where(eq(eftSystemFees.serviceName, service.code));

    if (existing) {
      const [updated] = await db
        .update(eftSystemFees)
        .set({
          ...(fixedFeeValue !== undefined && { fixedFeeValue: String(fixedFeeValue) }),
          ...(percentageFeeValue !== undefined && { percentageFeeValue: String(percentageFeeValue) }),
          ...(volumeFeeValue !== undefined && { volumeFeeValue: String(volumeFeeValue) }),
          ...(vatEnabled !== undefined && { vatEnabled }),
          ...(vatRate !== undefined && { vatRate: String(vatRate) }),
          updatedAt: new Date(),
          updatedBy: auth.session.user.id,
        })
        .where(eq(eftSystemFees.serviceName, service.code))
        .returning();

      writeAuditLog({
        userId: auth.session.user.id,
        action: "update",
        resource: "service_fees",
        resourceId: service.code,
        changes: { before: { fixedFeeValue: existing.fixedFeeValue }, after: { fixedFeeValue } },
        request,
      });

      return NextResponse.json({ success: true, data: updated });
    }

    const [created] = await db
      .insert(eftSystemFees)
      .values({
        serviceName: service.code,
        fixedFeeValue: String(fixedFeeValue ?? "5.00"),
        percentageFeeValue: String(percentageFeeValue ?? "2.50"),
        volumeFeeValue: String(volumeFeeValue ?? "2.00"),
        vatEnabled: vatEnabled ?? true,
        vatRate: String(vatRate ?? "15.00"),
        updatedBy: auth.session.user.id,
      })
      .returning();

    writeAuditLog({
      userId: auth.session.user.id,
      action: "create",
      resource: "service_fees",
      resourceId: service.code,
      changes: { after: { fixedFeeValue, percentageFeeValue, volumeFeeValue } },
      request,
    });

    return NextResponse.json({ success: true, data: created });
  } catch (error: any) {
    console.error("Error updating service fees:", error);
    return NextResponse.json({ error: "Failed to update fees" }, { status: 500 });
  }
}
