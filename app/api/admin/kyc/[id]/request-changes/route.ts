import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sendKycRequestChangesEmail, sendAdminKycActionEmail } from "@/lib/email";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const note = typeof body?.note === "string" ? body.note.trim() : "";

  if (!note) {
    return NextResponse.json({ error: "Admin note is required" }, { status: 400 });
  }

  try {
    const [user] = await db
      .select({ id: users.id, email: users.email, name: users.name, companyName: users.companyName, kycStatus: users.kycStatus })
      .from(users)
      .where(eq(users.id, id));

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.kycStatus !== "pending_review") {
      return NextResponse.json(
        { error: `Cannot request changes for KYC status: ${user.kycStatus}` },
        { status: 400 }
      );
    }

    await db
      .update(users)
      .set({
        kycStatus: "pending",
        vettingAdminNote: note,
        vettingReviewedAt: new Date(),
        vettingReviewedBy: auth.session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));

    try {
      await sendKycRequestChangesEmail(user.email, user.companyName || user.name, note);
    } catch (e) {
      console.error("Failed to send request-changes email:", e);
    }

    try {
      await sendAdminKycActionEmail(
        "Requested Changes",
        { name: user.name || "", email: user.email, companyName: user.companyName || "" },
        note
      );
    } catch (e) {
      console.error("Failed to send admin notification:", e);
    }

    return NextResponse.json({ success: true, message: "Changes requested — user notified" });
  } catch (error: any) {
    console.error("Error requesting changes:", error);
    return NextResponse.json({ error: "Failed to request changes" }, { status: 500 });
  }
}
