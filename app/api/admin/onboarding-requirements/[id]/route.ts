import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { onboardingRequirements, companyDocuments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  try {
    const [existing] = await db
      .select()
      .from(onboardingRequirements)
      .where(eq(onboardingRequirements.id, id));

    if (!existing) {
      return NextResponse.json({ error: "Requirement not found" }, { status: 404 });
    }

    const body = await req.json();
    const updates: Record<string, any> = { updatedAt: new Date() };

    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.description !== undefined) updates.description = body.description?.trim() || null;
    if (body.appliesTo !== undefined) {
      const valid = ["merchant", "partner", "both"];
      if (!valid.includes(body.appliesTo)) {
        return NextResponse.json({ error: "Invalid appliesTo value" }, { status: 400 });
      }
      updates.appliesTo = body.appliesTo;
    }
    if (body.required !== undefined) updates.required = !!body.required;
    if (body.active !== undefined) updates.active = !!body.active;

    const [updated] = await db
      .update(onboardingRequirements)
      .set(updates)
      .where(eq(onboardingRequirements.id, id))
      .returning();

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Error updating requirement:", error);
    return NextResponse.json({ error: "Failed to update requirement" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  try {
    const [existing] = await db
      .select()
      .from(onboardingRequirements)
      .where(eq(onboardingRequirements.id, id));

    if (!existing) {
      return NextResponse.json({ error: "Requirement not found" }, { status: 404 });
    }

    const refs = await db
      .select({ id: companyDocuments.id })
      .from(companyDocuments)
      .where(eq(companyDocuments.requirementId, id))
      .limit(1);

    if (refs.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete — documents reference this requirement. Deactivate it instead." },
        { status: 409 }
      );
    }

    await db.delete(onboardingRequirements).where(eq(onboardingRequirements.id, id));

    return NextResponse.json({ success: true, message: "Requirement deleted" });
  } catch (error: any) {
    console.error("Error deleting requirement:", error);
    return NextResponse.json({ error: "Failed to delete requirement" }, { status: 500 });
  }
}
