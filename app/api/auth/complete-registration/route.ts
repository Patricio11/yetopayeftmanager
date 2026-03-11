import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const registrationSchema = z.object({
  userId: z.string().min(1).max(255),
  fullName: z.string().max(255).optional(),
  phone: z.string().max(20).optional(),
  companyName: z.string().max(255).optional(),
});

/**
 * POST /api/auth/complete-registration
 *
 * Saves extra merchant fields (phone, companyName) right after sign-up.
 * No session required — called before email verification.
 *
 * Security: Only updates users who haven't verified their email yet,
 * preventing abuse on already-active accounts.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, fullName, phone, companyName } = registrationSchema.parse(body);

    // Only allow updates on unverified users (just registered)
    const [user] = await db
      .select({ id: users.id, emailVerified: users.emailVerified })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { success: false, message: "Use /api/merchant/settings to update verified accounts" },
        { status: 403 }
      );
    }

    // Build update — only set provided fields
    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (fullName !== undefined) updateData.fullName = fullName;
    if (phone !== undefined) updateData.phone = phone;
    if (companyName !== undefined) updateData.companyName = companyName;

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId));

    return NextResponse.json({ success: true, message: "Registration details saved" });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error completing registration:", error);
    return NextResponse.json(
      { success: false, message: "Failed to save registration details" },
      { status: 500 }
    );
  }
}
