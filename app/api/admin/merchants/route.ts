import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/authorization';
import { db } from '@/lib/db';
import { users, verifications } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import crypto from 'crypto';
import { writeAuditLog } from '@/lib/audit';

const createMerchantSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  companyName: z.string().min(1),
  companyLogoUrl: z.string().url().optional(),
  partnerId: z.string().optional(), // Assign merchant to a partner
});

/**
 * GET /api/admin/merchants
 * List all merchants (admin only)
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const merchants = await db
      .select()
      .from(users)
      .where(eq(users.role, 'merchant'));

    return NextResponse.json({
      success: true,
      data: merchants,
      count: merchants.length,
    });
  } catch (error: any) {
    console.error('Error fetching merchants:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch merchants' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/merchants
 * Create a new merchant (admin only)
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  try {
    const body = await request.json();
    const validatedData = createMerchantSchema.parse(body);
    validatedData.email = validatedData.email.toLowerCase();

    const merchantId = crypto.randomUUID();

    const [merchant] = await db
      .insert(users)
      .values({
        id: merchantId,
        email: validatedData.email,
        name: validatedData.name,
        role: 'merchant',
        companyName: validatedData.companyName,
        companyLogoUrl: validatedData.companyLogoUrl,
        partnerId: validatedData.partnerId || null,
        emailVerified: false,
        isActive: false, // Inactive until they accept the invitation
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Generate a secure invitation token (48 bytes = 64 chars hex)
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

    writeAuditLog({ userId: auth.session.user.id, action: "create", resource: "merchant", resourceId: merchantId, changes: { after: { email: validatedData.email, name: validatedData.name, companyName: validatedData.companyName } }, request });

    return NextResponse.json({
      success: true,
      message: 'Merchant created successfully. Send the invitation link to the merchant.',
      data: merchant,
      invitation: {
        link: invitationLink,
        expiresAt: invitationExpiry.toISOString(),
        note: 'Send this link to the merchant so they can set up their password and activate their account.',
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating merchant:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to create merchant' },
      { status: 500 }
    );
  }
}
