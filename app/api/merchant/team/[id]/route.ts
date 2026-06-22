import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { merchantTeamMembers, users, verifications } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { getEffectiveMerchantId, getTeamMembership, hasPermission, TEAM_PERMISSIONS } from "@/lib/auth/team-permissions";
import crypto from "crypto";
import { sendTeamInvitationEmail } from "@/lib/email";

async function requireTeamManage(sessionUserId: string) {
  const merchantId = await getEffectiveMerchantId(sessionUserId);

  if (merchantId !== sessionUserId) {
    const membership = await getTeamMembership(sessionUserId);
    if (!membership || !hasPermission(membership, TEAM_PERMISSIONS.TEAM_MANAGE)) {
      return { authorized: false as const, merchantId };
    }
  }

  return { authorized: true as const, merchantId };
}

const updateSchema = z.object({
  role: z.enum(["admin", "user"]).optional(),
  permissions: z.array(z.string()).optional(),
  status: z.enum(["active", "suspended"]).optional(),
});

/**
 * PATCH /api/merchant/team/[id]
 * Update a team member's role, permissions, or status.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { authorized, merchantId } = await requireTeamManage(session.user.id);
    if (!authorized) {
      return NextResponse.json(
        { success: false, message: "You don't have permission to manage the team" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const updates = updateSchema.parse(body);

    // Verify the member belongs to this merchant
    const member = await db.query.merchantTeamMembers.findFirst({
      where: and(
        eq(merchantTeamMembers.id, id),
        eq(merchantTeamMembers.merchantId, merchantId)
      ),
    });

    if (!member) {
      return NextResponse.json(
        { success: false, message: "Team member not found" },
        { status: 404 }
      );
    }

    // Can't change owner role
    if (member.role === "owner") {
      return NextResponse.json(
        { success: false, message: "Cannot modify the account owner" },
        { status: 400 }
      );
    }

    const setValues: Record<string, any> = { updatedAt: new Date() };
    if (updates.role !== undefined) setValues.role = updates.role;
    if (updates.permissions !== undefined) setValues.permissions = updates.permissions;
    if (updates.status !== undefined) setValues.status = updates.status;

    await db
      .update(merchantTeamMembers)
      .set(setValues)
      .where(eq(merchantTeamMembers.id, id));

    return NextResponse.json({
      success: true,
      message: "Team member updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating team member:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to update team member" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/merchant/team/[id]
 * Remove a team member.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { authorized, merchantId } = await requireTeamManage(session.user.id);
    if (!authorized) {
      return NextResponse.json(
        { success: false, message: "You don't have permission to manage the team" },
        { status: 403 }
      );
    }

    const member = await db.query.merchantTeamMembers.findFirst({
      where: and(
        eq(merchantTeamMembers.id, id),
        eq(merchantTeamMembers.merchantId, merchantId)
      ),
    });

    if (!member) {
      return NextResponse.json(
        { success: false, message: "Team member not found" },
        { status: 404 }
      );
    }

    if (member.role === "owner") {
      return NextResponse.json(
        { success: false, message: "Cannot remove the account owner" },
        { status: 400 }
      );
    }

    await db
      .delete(merchantTeamMembers)
      .where(eq(merchantTeamMembers.id, id));

    return NextResponse.json({
      success: true,
      message: "Team member removed successfully",
    });
  } catch (error: any) {
    console.error("Error removing team member:", error);
    return NextResponse.json(
      { success: false, message: "Failed to remove team member" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/merchant/team/[id]
 * Resend invitation to a pending team member.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { authorized, merchantId } = await requireTeamManage(session.user.id);
    if (!authorized) {
      return NextResponse.json(
        { success: false, message: "You don't have permission to manage the team" },
        { status: 403 }
      );
    }

    const member = await db.query.merchantTeamMembers.findFirst({
      where: and(
        eq(merchantTeamMembers.id, id),
        eq(merchantTeamMembers.merchantId, merchantId)
      ),
    });

    if (!member || member.status !== "pending") {
      return NextResponse.json(
        { success: false, message: "Pending team member not found" },
        { status: 404 }
      );
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, member.userId),
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Delete old tokens for this email
    const oldTokens = await db
      .select({ id: verifications.id })
      .from(verifications)
      .where(eq(verifications.identifier, user.email));

    for (const t of oldTokens) {
      await db.delete(verifications).where(eq(verifications.id, t.id));
    }

    // Create new token
    const token = crypto.randomBytes(48).toString("hex");
    await db.insert(verifications).values({
      id: crypto.randomUUID(),
      identifier: user.email,
      value: token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const invitationLink = `${appUrl}/auth/accept-invitation?token=${token}&email=${encodeURIComponent(user.email)}`;

    const merchant = await db.query.users.findFirst({
      where: eq(users.id, merchantId),
    });

    const roleLabel = member.role === "admin" ? "Admin" : "User";

    await sendTeamInvitationEmail(
      user.email,
      invitationLink,
      session.user.name || "Your team",
      merchant?.companyName || merchant?.name || "Your company",
      roleLabel
    );

    return NextResponse.json({
      success: true,
      message: `Invitation resent to ${user.email}`,
    });
  } catch (error: any) {
    console.error("Error resending invitation:", error);
    return NextResponse.json(
      { success: false, message: "Failed to resend invitation" },
      { status: 500 }
    );
  }
}
