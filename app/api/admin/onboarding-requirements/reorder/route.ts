import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { onboardingRequirements } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const body = await req.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids array is required" }, { status: 400 });
    }

    for (let i = 0; i < ids.length; i++) {
      await db
        .update(onboardingRequirements)
        .set({ sortOrder: i, updatedAt: new Date() })
        .where(eq(onboardingRequirements.id, ids[i]));
    }

    return NextResponse.json({ success: true, message: "Order updated" });
  } catch (error: any) {
    console.error("Error reordering requirements:", error);
    return NextResponse.json({ error: "Failed to reorder" }, { status: 500 });
  }
}
