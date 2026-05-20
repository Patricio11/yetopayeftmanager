import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  let email = typeof body?.email === "string" ? body.email.trim() : undefined;

  if (!email) {
    const session = await getSession();
    if (session?.user?.email) email = session.user.email;
  }

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const baseURL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    await auth.api.sendVerificationEmail({
      body: { email, callbackURL: `${baseURL}/auth/verify-email` },
    });
  } catch {
    // Don't leak whether the email exists
  }

  return NextResponse.json({ success: true });
}
