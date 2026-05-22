import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { paymentServices } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import { writeAuditLog } from "@/lib/audit";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const services = await db
      .select()
      .from(paymentServices)
      .orderBy(asc(paymentServices.displayOrder));

    return NextResponse.json({ success: true, data: services });
  } catch (error: any) {
    console.error("Error fetching services:", error);
    return NextResponse.json({ error: "Failed to fetch services" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const { code, name, description, category, provider, icon, displayOrder, requiresSetup, metadata } = body;

    if (!code || !name || !category || !provider) {
      return NextResponse.json(
        { error: "code, name, category, and provider are required" },
        { status: 400 }
      );
    }

    const [service] = await db
      .insert(paymentServices)
      .values({
        code: code.toLowerCase().replace(/\s+/g, "_"),
        name,
        description: description || null,
        category,
        provider,
        icon: icon || null,
        isActive: false,
        requiresSetup: requiresSetup ?? false,
        displayOrder: displayOrder ?? 0,
        metadata: metadata || {},
      })
      .returning();

    writeAuditLog({
      userId: auth.session.user.id,
      action: "create",
      resource: "payment_service",
      resourceId: service.id,
      changes: { after: { code, name, category, provider } },
      request,
    });

    return NextResponse.json({ success: true, data: service });
  } catch (error: any) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "A service with this code already exists" }, { status: 409 });
    }
    console.error("Error creating service:", error);
    return NextResponse.json({ error: "Failed to create service" }, { status: 500 });
  }
}
