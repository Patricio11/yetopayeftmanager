import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { onboardingRequirements } from "@/lib/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const rows = await db
      .select()
      .from(onboardingRequirements)
      .orderBy(asc(onboardingRequirements.sortOrder));

    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    console.error("Error fetching requirements:", error);
    return NextResponse.json({ error: "Failed to fetch requirements" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const body = await req.json();
    const { name, description, appliesTo, required: isRequired } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const validAppliesTo = ["merchant", "partner", "both"];
    if (appliesTo && !validAppliesTo.includes(appliesTo)) {
      return NextResponse.json({ error: "Invalid appliesTo value" }, { status: 400 });
    }

    const all = await db
      .select({ sortOrder: onboardingRequirements.sortOrder })
      .from(onboardingRequirements)
      .orderBy(asc(onboardingRequirements.sortOrder));

    const maxSort = all.length > 0 ? Math.max(...all.map((r) => r.sortOrder)) : -1;

    const id = crypto.randomUUID();
    const [created] = await db
      .insert(onboardingRequirements)
      .values({
        id,
        name: name.trim(),
        description: description?.trim() || null,
        appliesTo: appliesTo || "both",
        required: isRequired !== false,
        sortOrder: maxSort + 1,
        active: true,
        uploadedBy: auth.session.user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json({ success: true, data: created });
  } catch (error: any) {
    console.error("Error creating requirement:", error);
    return NextResponse.json({ error: "Failed to create requirement" }, { status: 500 });
  }
}
