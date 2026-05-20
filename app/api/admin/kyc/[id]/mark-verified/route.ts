import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  try {
    const [user] = await db
      .select({ id: users.id, email: users.email, emailVerified: users.emailVerified, vettingStatus: users.vettingStatus })
      .from(users)
      .where(eq(users.id, id));

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ error: "Email already verified" }, { status: 400 });
    }

    const newVettingStatus =
      user.vettingStatus === "EMAIL_PENDING" ? "ONBOARDING_PENDING" : user.vettingStatus;

    await db
      .update(users)
      .set({
        emailVerified: true,
        vettingStatus: newVettingStatus,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));

    return NextResponse.json({
      success: true,
      message: "Email marked as verified — user advanced to onboarding",
    });
  } catch (error: any) {
    console.error("Error marking verified:", error);
    return NextResponse.json({ error: "Failed to mark verified" }, { status: 500 });
  }
}
