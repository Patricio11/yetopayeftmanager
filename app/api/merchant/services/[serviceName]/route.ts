import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { paymentServices, userServices } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ serviceName: string }> }
) {
  const auth = await requireAuth();
  if (!auth.authorized) return auth.response;

  const userId = auth.session.user.id;
  const { serviceName } = await params;

  try {
    const [service] = await db
      .select()
      .from(paymentServices)
      .where(eq(paymentServices.code, serviceName));

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    if (!service.isActive) {
      return NextResponse.json(
        { error: "This service is not currently available" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const isEnabled = body.isEnabled === true;

    const [existing] = await db
      .select()
      .from(userServices)
      .where(
        and(
          eq(userServices.userId, userId),
          eq(userServices.serviceName, serviceName)
        )
      );

    if (existing) {
      await db
        .update(userServices)
        .set({ isEnabled, updatedAt: new Date() })
        .where(eq(userServices.id, existing.id));
    } else {
      await db.insert(userServices).values({
        userId,
        serviceName,
        isEnabled,
      });
    }

    return NextResponse.json({
      success: true,
      message: `${service.name} ${isEnabled ? "enabled" : "disabled"}`,
    });
  } catch (error: any) {
    console.error("Error toggling merchant service:", error);
    return NextResponse.json({ error: "Failed to update service" }, { status: 500 });
  }
}
