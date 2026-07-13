import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const brandingSchema = z.object({
  paymentPageBranding: z.enum(["yetopay", "logo", "hidden"]),
});

/**
 * GET /api/merchant/branding
 * Current payment page branding preference for the logged-in account.
 * Partners' preference applies to all their merchants' payment pages.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: { metadata: true, companyLogoUrl: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        paymentPageBranding:
          ((user?.metadata as any)?.paymentPageBranding as string) || "yetopay",
        companyLogoUrl: user?.companyLogoUrl || null,
      },
    });
  } catch (error) {
    console.error("Error fetching branding settings:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch branding settings" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/merchant/branding
 * Update the payment page branding preference.
 */
export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { paymentPageBranding } = brandingSchema.parse(body);

    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: { metadata: true, companyLogoUrl: true },
    });

    if (paymentPageBranding === "logo" && !user?.companyLogoUrl) {
      return NextResponse.json(
        { success: false, message: "Upload your company logo first to use it on the payment page" },
        { status: 400 }
      );
    }

    await db
      .update(users)
      .set({
        metadata: { ...((user?.metadata as any) || {}), paymentPageBranding },
        updatedAt: new Date(),
      })
      .where(eq(users.id, session.user.id));

    return NextResponse.json({
      success: true,
      message: "Payment page branding updated",
      data: { paymentPageBranding },
    });
  } catch (error) {
    console.error("Error updating branding settings:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Invalid branding option" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to update branding settings" },
      { status: 500 }
    );
  }
}
