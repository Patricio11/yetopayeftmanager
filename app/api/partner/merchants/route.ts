import { NextRequest, NextResponse } from 'next/server';
import { requirePartner } from '@/lib/auth/authorization';
import { db } from '@/lib/db';
import { users, verifications } from '@/lib/db/schema';
import { eq, and, count, sql, ilike, or } from 'drizzle-orm';
import { z } from 'zod';
import crypto from 'crypto';
import { writeAuditLog } from '@/lib/audit';
import { sendMerchantInvitedByPartnerEmail, sendPartnerActionNotificationEmail } from '@/lib/email';

const createMerchantSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  companyName: z.string().min(1),
});

/**
 * GET /api/partner/merchants
 * List partner's merchants with search/filter and pagination
 */
export async function GET(request: NextRequest) {
  const auth = await requirePartner();
  if (!auth.authorized) return auth.response;
  const partnerId = auth.session.user.id;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status'); // 'active' | 'inactive'
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50'), 1), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

    // Build conditions
    const conditions = [
      eq(users.partnerId, partnerId),
      eq(users.role, 'merchant'),
    ];

    if (status === 'active') {
      conditions.push(eq(users.isActive, true));
    } else if (status === 'inactive') {
      conditions.push(eq(users.isActive, false));
    }

    // Base where clause
    let whereClause = and(...conditions);

    // Apply search filter
    if (search) {
      const searchPattern = `%${search}%`;
      whereClause = and(
        whereClause!,
        or(
          ilike(users.name, searchPattern),
          ilike(users.email, searchPattern),
          ilike(users.companyName, searchPattern)
        )
      );
    }

    // Count total
    const [totalResult] = await db
      .select({ total: count() })
      .from(users)
      .where(whereClause);

    const total = totalResult?.total || 0;

    // Fetch merchants
    const merchants = await db
      .select()
      .from(users)
      .where(whereClause)
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      success: true,
      data: merchants,
      count: merchants.length,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error: any) {
    console.error('Error fetching partner merchants:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch merchants' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/partner/merchants
 * Partner creates a new merchant (invitation pattern)
 */
export async function POST(request: NextRequest) {
  const auth = await requirePartner();
  if (!auth.authorized) return auth.response;
  const partnerId = auth.session.user.id;

  try {
    const body = await request.json();
    const validatedData = createMerchantSchema.parse(body);

    // Get partner's company name
    const partner = await db.query.users.findFirst({
      where: eq(users.id, partnerId),
    });
    const partnerCompanyName = partner?.companyName || partner?.name || 'Partner';

    const merchantId = crypto.randomUUID();

    const [merchant] = await db
      .insert(users)
      .values({
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
      })
      .returning();

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

    // Send invitation email to merchant
    await sendMerchantInvitedByPartnerEmail(
      validatedData.email,
      invitationLink,
      partnerCompanyName
    );

    // Notify admins
    const admins = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.role, 'admin'));

    const adminEmails = admins.map((a) => a.email);
    if (adminEmails.length > 0) {
      await sendPartnerActionNotificationEmail(
        adminEmails,
        partnerCompanyName,
        'Created Merchant',
        {
          Merchant: validatedData.email,
          Partner: partnerCompanyName,
        }
      );
    }

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
        },
      },
      request,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Merchant created and invitation sent.',
        data: merchant,
        invitation: {
          link: invitationLink,
          expiresAt: invitationExpiry.toISOString(),
        },
      },
      { status: 201 }
    );
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
