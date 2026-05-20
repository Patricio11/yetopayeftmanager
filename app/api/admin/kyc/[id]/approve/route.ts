import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sendKycApprovedEmail, sendAdminKycActionEmail } from "@/lib/email";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;

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
        { error: `Cannot approve KYC with status: ${user.kycStatus}` },
        { status: 400 }
      );
    }

    await db
      .update(users)
      .set({
        kycStatus: "approved",
        accountMode: "live",
        vettingRejectionReason: null,
        vettingAdminNote: null,
        vettingReviewedAt: new Date(),
        vettingReviewedBy: auth.session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));

    try {
      await sendKycApprovedEmail(user.email, user.companyName || user.name);
    } catch (e) {
      console.error("Failed to send approval email:", e);
    }

    try {
      await sendAdminKycActionEmail(
        "Approved",
        { name: user.name || "", email: user.email, companyName: user.companyName || "" }
      );
    } catch (e) {
      console.error("Failed to send admin notification:", e);
    }

    return NextResponse.json({ success: true, message: "User approved successfully" });
  } catch (error: any) {
    console.error("Error approving user:", error);
    return NextResponse.json({ error: "Failed to approve user" }, { status: 500 });
  }
}
