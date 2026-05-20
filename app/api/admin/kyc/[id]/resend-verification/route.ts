import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminAuth = await requireAdmin();
  if (!adminAuth.authorized) return adminAuth.response;

  const { id } = await params;

  try {
    const [user] = await db
      .select({ id: users.id, email: users.email, emailVerified: users.emailVerified })
      .from(users)
      .where(eq(users.id, id));

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ error: "Email already verified" }, { status: 400 });
    }

    const baseURL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    await auth.api.sendVerificationEmail({
      body: { email: user.email, callbackURL: `${baseURL}/auth/verify-email` },
    });

    return NextResponse.json({ success: true, message: "Verification email resent" });
  } catch (error: any) {
    console.error("Error resending verification:", error);
    return NextResponse.json({ error: "Failed to resend verification" }, { status: 500 });
  }
}
