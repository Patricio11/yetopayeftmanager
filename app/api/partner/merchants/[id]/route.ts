import { NextRequest, NextResponse } from 'next/server';
import { requirePartner } from '@/lib/auth/authorization';
import { db } from '@/lib/db';
import { users, eftTransactions } from '@/lib/db/schema';
import { eq, and, count, sum, sql } from 'drizzle-orm';
import { z } from 'zod';
import { writeAuditLog } from '@/lib/audit';
import { sendPartnerActionNotificationEmail } from '@/lib/email';

const updateMerchantSchema = z.object({
  name: z.string().min(1).optional(),
  companyName: z.string().min(1).optional(),
  phone: z.string().optional(),
  address: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postal_code: z.string().optional(),
      country: z.string().optional(),
    })
    .optional(),
  website: z.string().url().max(255).optional().or(z.literal("")),
  eftSettings: z
    .object({
      notifyUrl: z.string().url().optional(),
      successUrl: z.string().url().optional(),
      failureUrl: z.string().url().optional(),
      cancelledUrl: z.string().url().optional(),
    })
    .optional(),
});

/**
 * GET /api/partner/merchants/[id]
 * Get merchant detail (only if merchant belongs to this partner)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePartner();
  if (!auth.authorized) return auth.response;
  const partnerId = auth.session.user.id;

  const { id } = await params;

  try {
    const merchant = await db.query.users.findFirst({
      where: and(
        eq(users.id, id),
        eq(users.partnerId, partnerId),
        eq(users.role, 'merchant')
      ),
    });

    if (!merchant) {
      return NextResponse.json(
        { success: false, message: 'Merchant not found' },
        { status: 404 }
      );
    }

    // Get transaction stats for this merchant
    const [txStats] = await db
      .select({
        total: count(),
        totalAmount: sum(eftTransactions.amount),
        completed: count(
          sql`CASE WHEN ${eftTransactions.status} = 'completed' THEN 1 END`
        ),
        failed: count(
          sql`CASE WHEN ${eftTransactions.status} = 'failed' THEN 1 END`
        ),
        pending: count(
          sql`CASE WHEN ${eftTransactions.status} IN ('not_started', 'initiated') THEN 1 END`
        ),
      })
      .from(eftTransactions)
      .where(eq(eftTransactions.merchantId, id));

    return NextResponse.json({
      success: true,
      data: {
        ...merchant,
        stats: {
          transactions: {
            total: txStats?.total || 0,
            totalAmount: txStats?.totalAmount || '0',
            completed: txStats?.completed || 0,
            failed: txStats?.failed || 0,
            pending: txStats?.pending || 0,
          },
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching merchant:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch merchant' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/partner/merchants/[id]
 * Update merchant settings (limited fields only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePartner();
  if (!auth.authorized) return auth.response;
  const partnerId = auth.session.user.id;

  const { id } = await params;

  try {
    const body = await request.json();
    const updates = updateMerchantSchema.parse(body);

    // Verify merchant belongs to this partner
    const merchant = await db.query.users.findFirst({
      where: and(
        eq(users.id, id),
        eq(users.partnerId, partnerId),
        eq(users.role, 'merchant')
      ),
    });

    if (!merchant) {
      return NextResponse.json(
        { success: false, message: 'Merchant not found' },
        { status: 404 }
      );
    }

    // Handle website → metadata merge
    const mergedUpdates: any = { ...updates };
    if (updates.website !== undefined) {
      const existingMeta = (merchant.metadata as any) || {};
      mergedUpdates.metadata = { ...existingMeta, website: updates.website };
      delete mergedUpdates.website;
    }

    // Merge eftSettings with existing values
    if (updates.eftSettings) {
      const existing = (merchant.eftSettings as any) || {};
      mergedUpdates.eftSettings = { ...existing, ...updates.eftSettings };
    }
    if (updates.address) {
      const existing = (merchant.address as any) || {};
      mergedUpdates.address = { ...existing, ...updates.address };
    }

    const [updated] = await db
      .update(users)
      .set({
        ...mergedUpdates,
        updatedAt: new Date(),
        updatedBy: partnerId,
      })
      .where(eq(users.id, id))
      .returning();

    // Audit log
    writeAuditLog({
      userId: partnerId,
      action: 'update',
      resource: 'merchant',
      resourceId: id,
      changes: {
        before: {
          name: merchant.name,
          companyName: merchant.companyName,
          phone: merchant.phone,
        },
        after: updates,
      },
      request,
    });

    // Notify admins
    const partner = await db.query.users.findFirst({
      where: eq(users.id, partnerId),
    });
    const partnerCompanyName = partner?.companyName || partner?.name || 'Partner';

    const admins = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.role, 'admin'));

    const adminEmails = admins.map((a) => a.email);
    if (adminEmails.length > 0) {
      await sendPartnerActionNotificationEmail(adminEmails, partnerCompanyName, 'Updated Merchant', {
        Merchant: merchant.email,
        Partner: partnerCompanyName,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Merchant updated successfully',
      data: updated,
    });
  } catch (error: any) {
    console.error('Error updating merchant:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Failed to update merchant' },
      { status: 500 }
    );
  }
}
