import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/authorization';
import { db } from '@/lib/db';
import { users, verifications } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import { sendMerchantInvitationEmail } from '@/lib/email';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  try {
    const merchant = await db.query.users.findFirst({
      where: and(eq(users.id, id), eq(users.role, 'merchant')),
    });

    if (!merchant) {
      return NextResponse.json({ success: false, error: 'Merchant not found' }, { status: 404 });
    }

    if (merchant.isActive && merchant.emailVerified) {
      return NextResponse.json({ success: false, error: 'Merchant has already accepted the invitation' }, { status: 400 });
    }

    await db.delete(verifications).where(eq(verifications.identifier, merchant.email));

    const invitationToken = crypto.randomBytes(48).toString('hex');
    const invitationExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.insert(verifications).values({
      id: crypto.randomUUID(),
      identifier: merchant.email,
      value: invitationToken,
      expiresAt: invitationExpiry,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const invitationLink = `${appUrl}/auth/accept-invitation?token=${invitationToken}&email=${encodeURIComponent(merchant.email)}`;

    await sendMerchantInvitationEmail(merchant.email, invitationLink);

    return NextResponse.json({
      success: true,
      message: `Invitation resent to ${merchant.email}`,
    });
  } catch (error) {
    console.error('Error resending merchant invitation:', error);
    return NextResponse.json({ success: false, error: 'Failed to resend invitation' }, { status: 500 });
  }
}
