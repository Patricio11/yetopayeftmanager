import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { merchantTeamMembers, users, verifications } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import crypto from "crypto";
import { sendTeamInvitationEmail } from "@/lib/email";
import { getEffectiveMerchantId, TEAM_ROLES, getTeamMembership, hasPermission, TEAM_PERMISSIONS } from "@/lib/auth/team-permissions";

/**
 * GET /api/merchant/team
 * List all team members for the current merchant.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const merchantId = await getEffectiveMerchantId(session.user.id);

    const members = await db
      .select({
        id: merchantTeamMembers.id,
        userId: merchantTeamMembers.userId,
        role: merchantTeamMembers.role,
        permissions: merchantTeamMembers.permissions,
        status: merchantTeamMembers.status,
        invitedAt: merchantTeamMembers.invitedAt,
        acceptedAt: merchantTeamMembers.acceptedAt,
        userName: users.name,
        userEmail: users.email,
        userImage: users.image,
        userActive: users.isActive,
      })
      .from(merchantTeamMembers)
      .leftJoin(users, eq(merchantTeamMembers.userId, users.id))
      .where(eq(merchantTeamMembers.merchantId, merchantId))
      .orderBy(desc(merchantTeamMembers.createdAt));

    return NextResponse.json({ success: true, data: members });
  } catch (error: any) {
    console.error("Error fetching team members:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch team members" },
      { status: 500 }
    );
  }
}

const inviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(1, "Name is required"),
  role: z.enum(["admin", "user"]),
  permissions: z.array(z.string()).optional(),
});

/**
 * POST /api/merchant/team
 * Invite a new team member.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const merchantId = await getEffectiveMerchantId(session.user.id);

    // Check if the caller has team.manage permission (owner or admin with permission)
    if (merchantId !== session.user.id) {
      const membership = await getTeamMembership(session.user.id);
      if (!membership || !hasPermission(membership, TEAM_PERMISSIONS.TEAM_MANAGE)) {
        return NextResponse.json(
          { success: false, message: "You don't have permission to manage the team" },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const { email, name, role, permissions } = inviteSchema.parse(body);
    const normalizedEmail = email.toLowerCase();

    // Check if already a team member
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, normalizedEmail),
    });

    if (existingUser) {
      const existingMember = await db.query.merchantTeamMembers.findFirst({
        where: and(
          eq(merchantTeamMembers.merchantId, merchantId),
          eq(merchantTeamMembers.userId, existingUser.id)
        ),
      });

      if (existingMember) {
        return NextResponse.json(
          { success: false, message: "This user is already a team member" },
          { status: 400 }
        );
      }
    }

    // Can't invite yourself
    if (existingUser && existingUser.id === merchantId) {
      return NextResponse.json(
        { success: false, message: "You cannot invite yourself" },
        { status: 400 }
      );
    }

    const roleConfig = TEAM_ROLES[role];
    const memberPermissions = permissions || roleConfig.defaultPermissions as unknown as string[];

    // Create or find the user
    let userId: string;
    if (existingUser) {
      userId = existingUser.id;
    } else {
      const [newUser] = await db.insert(users).values({
        id: crypto.randomUUID(),
        name,
        email: normalizedEmail,
        role: "merchant",
        isActive: false,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      userId = newUser.id;
    }

    // Create pending team membership
    await db.insert(merchantTeamMembers).values({
      merchantId,
      userId,
      role,
      permissions: memberPermissions,
      invitedBy: session.user.id,
      invitedAt: new Date(),
      status: "pending",
    });

    // Generate invitation token
    const token = crypto.randomBytes(48).toString("hex");
    await db.insert(verifications).values({
      id: crypto.randomUUID(),
      identifier: normalizedEmail,
      value: token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Send invitation email
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const invitationLink = `${appUrl}/auth/accept-invitation?token=${token}&email=${encodeURIComponent(normalizedEmail)}`;

    const merchant = await db.query.users.findFirst({
      where: eq(users.id, merchantId),
    });

    await sendTeamInvitationEmail(
      normalizedEmail,
      invitationLink,
      session.user.name || "Your team",
      merchant?.companyName || merchant?.name || "Your company",
      roleConfig.label
    );

    return NextResponse.json({
      success: true,
      message: `Invitation sent to ${normalizedEmail}`,
    });
  } catch (error: any) {
    console.error("Error inviting team member:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    if (error?.code === "23505") {
      return NextResponse.json(
        { success: false, message: "This user is already a team member" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to invite team member" },
      { status: 500 }
    );
  }
}
