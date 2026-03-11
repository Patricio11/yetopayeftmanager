import { NextRequest, NextResponse } from 'next/server';
import { requirePartner } from '@/lib/auth/authorization';
import { db } from '@/lib/db';
import { users, verifications } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import crypto from 'crypto';
import { writeAuditLog } from '@/lib/audit';
import { sendMerchantInvitedByPartnerEmail } from '@/lib/email';

const inviteMerchantSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  companyName: z.string().min(1),
});

/**
 * POST /api/partner/merchants/invite
 * Partner invites a merchant via email — creates the user record and sends invitation
 */
export async function POST(request: NextRequest) {
  const auth = await requirePartner();
  if (!auth.authorized) return auth.response;
  const partnerId = auth.session.user.id;

  try {
    const body = await request.json();
    const validatedData = inviteMerchantSchema.parse(body);

    // Get partner info
    const partner = await db.query.users.findFirst({
      where: eq(users.id, partnerId),
    });
    const partnerCompanyName = partner?.companyName || partner?.name || 'Partner';

    // Check if the email is already registered
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, validatedData.email),
    });

    let merchantId: string;

    if (existingUser) {
      // If already a merchant under this partner, just resend invitation
      if (existingUser.partnerId === partnerId && existingUser.role === 'merchant') {
        merchantId = existingUser.id;
      } else {
        return NextResponse.json(
          {
            success: false,
            message: 'This email is already registered with a different account.',
          },
          { status: 409 }
        );
      }
    } else {
      // Create the merchant user
      merchantId = crypto.randomUUID();

      await db.insert(users).values({
        id: merchantId,
        email: validatedData.email,
        name: validatedData.name,
        role: 'merchant',
        companyName: validatedData.companyName,
        partnerId,
        emailVerified: false,
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Generate invitation token
    const invitationToken = crypto.randomBytes(48).toString('hex');
    const invitationExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db.insert(verifications).values({
      id: crypto.randomUUID(),
      identifier: validatedData.email,
      value: invitationToken,
      expiresAt: invitationExpiry,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const invitationLink = `${appUrl}/auth/accept-invitation?token=${invitationToken}&email=${encodeURIComponent(validatedData.email)}`;

    // Send invitation email
    await sendMerchantInvitedByPartnerEmail(
      validatedData.email,
      invitationLink,
      partnerCompanyName
    );

    // Audit log
    writeAuditLog({
      userId: partnerId,
      action: 'create',
      resource: 'merchant',
      resourceId: merchantId,
      changes: {
        after: {
          email: validatedData.email,
          name: validatedData.name,
          companyName: validatedData.companyName,
          partnerId,
          via: 'invite',
        },
      },
      request,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Invitation sent successfully.',
        invitation: {
          link: invitationLink,
          expiresAt: invitationExpiry.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error inviting merchant:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to invite merchant' },
      { status: 500 }
    );
  }
}
