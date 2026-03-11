import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/authorization';
import { db } from '@/lib/db';
import { users, eftTransactions } from '@/lib/db/schema';
import { eq, and, count, sum, sql } from 'drizzle-orm';
import { z } from 'zod';
import { writeAuditLog } from '@/lib/audit';

/**
 * GET /api/admin/partners/[id]
 * Get detailed partner information including stats
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  try {
    const partner = await db.query.users.findFirst({
      where: and(eq(users.id, id), eq(users.role, 'partner')),
    });

    if (!partner) {
      return NextResponse.json(
        { success: false, message: 'Partner not found' },
        { status: 404 }
      );
    }

    // Count merchants linked to this partner
    const [merchantStats] = await db
      .select({ total: count() })
      .from(users)
      .where(and(eq(users.partnerId, id), eq(users.role, 'merchant')));

    // Get aggregated transaction stats across all partner's merchants
    const [txStats] = await db
      .select({
        total: count(),
        totalAmount: sum(eftTransactions.amount),
        completed: count(sql`CASE WHEN ${eftTransactions.status} = 'completed' THEN 1 END`),
        failed: count(sql`CASE WHEN ${eftTransactions.status} = 'failed' THEN 1 END`),
      })
      .from(eftTransactions)
      .innerJoin(users, eq(eftTransactions.merchantId, users.id))
      .where(and(eq(users.partnerId, id), eq(users.role, 'merchant')));

    return NextResponse.json({
      success: true,
      data: {
        ...partner,
        stats: {
          merchantCount: merchantStats?.total || 0,
          transactions: {
            total: txStats?.total || 0,
            totalAmount: txStats?.totalAmount || '0',
            completed: txStats?.completed || 0,
            failed: txStats?.failed || 0,
          },
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching partner:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch partner' },
      { status: 500 }
    );
  }
}

const updatePartnerSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  companyName: z.string().optional(),
  companyLogoUrl: z.string().url().optional().nullable(),
  isActive: z.boolean().optional(),
  kycStatus: z.enum(['pending', 'approved', 'rejected']).optional(),
  accountMode: z.enum(['demo', 'live']).optional(),
});

/**
 * PATCH /api/admin/partners/[id]
 * Update partner details (admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  try {
    const body = await request.json();
    const updates = updatePartnerSchema.parse(body);

    const partner = await db.query.users.findFirst({
      where: and(eq(users.id, id), eq(users.role, 'partner')),
    });

    if (!partner) {
      return NextResponse.json(
        { success: false, message: 'Partner not found' },
        { status: 404 }
      );
    }

    const [updated] = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
        updatedBy: auth.session.user.id,
      })
      .where(eq(users.id, id))
      .returning();

    writeAuditLog({ userId: auth.session.user.id, action: "update", resource: "partner", resourceId: id, changes: { before: { name: partner.name, email: partner.email, isActive: partner.isActive, kycStatus: partner.kycStatus }, after: updates }, request });

    return NextResponse.json({
      success: true,
      message: 'Partner updated successfully',
      data: updated,
    });
  } catch (error: any) {
    console.error('Error updating partner:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Failed to update partner' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/partners/[id]
 * Soft-delete a partner (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  try {
    const partner = await db.query.users.findFirst({
      where: and(eq(users.id, id), eq(users.role, 'partner')),
    });

    if (!partner) {
      return NextResponse.json(
        { success: false, message: 'Partner not found' },
        { status: 404 }
      );
    }

    // Soft delete
    await db
      .update(users)
      .set({
        isActive: false,
        deletedAt: new Date(),
        updatedBy: auth.session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));

    writeAuditLog({ userId: auth.session.user.id, action: "delete", resource: "partner", resourceId: id, changes: { before: { name: partner.name, email: partner.email, companyName: partner.companyName } }, request });

    return NextResponse.json({
      success: true,
      message: 'Partner deactivated successfully',
    });
  } catch (error: any) {
    console.error('Error deleting partner:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to deactivate partner' },
      { status: 500 }
    );
  }
}
