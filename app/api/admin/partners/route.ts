import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/authorization';
import { db } from '@/lib/db';
import { users, verifications } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import crypto from 'crypto';
import { writeAuditLog } from '@/lib/audit';
import { sendPartnerInvitationEmail } from '@/lib/email';

const createPartnerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  companyName: z.string().min(1),
  companyLogoUrl: z.string().url().optional(),
});

/**
 * GET /api/admin/partners
 * List all partners (admin only)
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const partners = await db
      .select()
      .from(users)
      .where(eq(users.role, 'partner'));

    return NextResponse.json({
      success: true,
      data: partners,
      count: partners.length,
    });
  } catch (error: any) {
    console.error('Error fetching partners:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch partners' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/partners
 * Create a new partner via invitation (admin only)
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const validatedData = createPartnerSchema.parse(body);

    const partnerId = crypto.randomUUID();

    const [partner] = await db
      .insert(users)
      .values({
        id: partnerId,
        email: validatedData.email,
        name: validatedData.name,
        role: 'partner',
        companyName: validatedData.companyName,
        companyLogoUrl: validatedData.companyLogoUrl,
        emailVerified: false,
        isActive: false, // Inactive until they accept the invitation
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Generate a secure invitation token (48 bytes = 96 chars hex)
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
    const invitationLink = `${appUrl}/auth/accept-invitation?token=${invitationToken}&email=${encodeURIComponent(validatedData.email)}&role=partner`;

    // Send invitation email (fire-and-forget)
    sendPartnerInvitationEmail(validatedData.email, invitationLink).catch((err) =>
      console.error('Failed to send partner invitation email:', err)
    );

    writeAuditLog({ userId: auth.session.user.id, action: "create", resource: "partner", resourceId: partnerId, changes: { after: { email: validatedData.email, name: validatedData.name, companyName: validatedData.companyName } }, request });

    return NextResponse.json({
      success: true,
      message: 'Partner created successfully. Send the invitation link to the partner.',
      data: partner,
      invitation: {
        link: invitationLink,
        expiresAt: invitationExpiry.toISOString(),
        note: 'Send this link to the partner so they can set up their password and activate their account.',
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating partner:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to create partner' },
      { status: 500 }
    );
  }
}
