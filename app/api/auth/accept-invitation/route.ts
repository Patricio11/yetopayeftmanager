import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, verifications, accounts, merchantTeamMembers } from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { z } from "zod";
import crypto from "crypto";

const acceptInvitationSchema = z.object({
  token: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

/**
 * POST /api/auth/accept-invitation
 * Accept a merchant invitation — set password and activate account.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = acceptInvitationSchema.parse(body);
    const token = parsed.token;
    const email = parsed.email.toLowerCase();
    const password = parsed.password;

    // Find valid invitation
    const invitation = await db.query.verifications.findFirst({
      where: and(
        eq(verifications.identifier, email),
        eq(verifications.value, token),
        gt(verifications.expiresAt, new Date())
      ),
    });

    if (!invitation) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired invitation link." },
        { status: 400 }
      );
    }

    // Find the merchant user
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User account not found." },
        { status: 404 }
      );
    }

    if (user.isActive) {
      return NextResponse.json(
        { success: false, message: "This account has already been activated." },
        { status: 400 }
      );
    }

    // Hash the password using the same method as Better Auth (bcrypt-like via Web Crypto)
    // Better Auth stores passwords in the `account` table with providerId = "credential"
    const { hashPassword } = await import("better-auth/crypto");
    const hashedPassword = await hashPassword(password);

    // Check if an account record already exists for this user
    const existingAccount = await db.query.accounts.findFirst({
      where: and(
        eq(accounts.userId, user.id),
        eq(accounts.providerId, "credential")
      ),
    });

    if (existingAccount) {
      // Update existing account with new password
      await db
        .update(accounts)
        .set({
          password: hashedPassword,
          updatedAt: new Date(),
        })
        .where(eq(accounts.id, existingAccount.id));
    } else {
      // Create credential account for Better Auth
      await db.insert(accounts).values({
        id: crypto.randomUUID(),
        accountId: user.id,
        providerId: "credential",
        userId: user.id,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Activate the user
    await db
      .update(users)
      .set({
        isActive: true,
        emailVerified: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // Activate any pending team memberships for this user
    await db
      .update(merchantTeamMembers)
      .set({
        status: "active",
        acceptedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(merchantTeamMembers.userId, user.id),
          eq(merchantTeamMembers.status, "pending")
        )
      );

    // Delete the used invitation token
    await db
      .delete(verifications)
      .where(eq(verifications.id, invitation.id));

    return NextResponse.json({
      success: true,
      message: "Account activated successfully. You can now sign in.",
    });
  } catch (error: any) {
    console.error("Error accepting invitation:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to activate account. Please try again." },
      { status: 500 }
    );
  }
}
