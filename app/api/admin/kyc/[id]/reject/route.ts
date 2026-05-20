import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sendKycRejectedEmail, sendAdminKycActionEmail } from "@/lib/email";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";

  if (!reason) {
    return NextResponse.json({ error: "Rejection reason is required" }, { status: 400 });
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
        { error: `Cannot reject KYC with status: ${user.kycStatus}` },
        { status: 400 }
      );
    }

    await db
      .update(users)
      .set({
        kycStatus: "rejected",
        vettingRejectionReason: reason,
        vettingReviewedAt: new Date(),
        vettingReviewedBy: auth.session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));

    try {
      await sendKycRejectedEmail(user.email, user.companyName || user.name, reason);
    } catch (e) {
      console.error("Failed to send rejection email:", e);
    }

    try {
      await sendAdminKycActionEmail(
        "Rejected",
        { name: user.name || "", email: user.email, companyName: user.companyName || "" },
        reason
      );
    } catch (e) {
      console.error("Failed to send admin notification:", e);
    }

    return NextResponse.json({ success: true, message: "User rejected" });
  } catch (error: any) {
    console.error("Error rejecting user:", error);
    return NextResponse.json({ error: "Failed to reject user" }, { status: 500 });
  }
}
