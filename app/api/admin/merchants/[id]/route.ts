import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/authorization';
import { db } from '@/lib/db';
import { users, eftTransactions, eftBankAccounts, apiKeys, webhookConfigurations, merchantTeamMembers } from '@/lib/db/schema';
import { eq, and, count, sum, sql } from 'drizzle-orm';
import { z } from 'zod';

/**
 * GET /api/admin/merchants/[id]
 * Get detailed merchant information including stats
 */
export async function GET(
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
      return NextResponse.json(
        { success: false, message: 'Merchant not found' },
        { status: 404 }
      );
    }

    // Get transaction stats
    const [txStats] = await db
      .select({
        total: count(),
        totalAmount: sum(eftTransactions.amount),
        completed: count(sql`CASE WHEN ${eftTransactions.status} = 'completed' THEN 1 END`),
        failed: count(sql`CASE WHEN ${eftTransactions.status} = 'failed' THEN 1 END`),
        pending: count(sql`CASE WHEN ${eftTransactions.status} IN ('not_started', 'initiated') THEN 1 END`),
      })
      .from(eftTransactions)
      .where(eq(eftTransactions.merchantId, id));

    // Get bank accounts count
    const [bankStats] = await db
      .select({ total: count() })
      .from(eftBankAccounts)
      .where(eq(eftBankAccounts.merchantId, id));

    // Get API keys count
    const [keyStats] = await db
      .select({ total: count() })
      .from(apiKeys)
      .where(eq(apiKeys.merchantId, id));

    // Get team members count
    const [teamStats] = await db
      .select({ total: count() })
      .from(merchantTeamMembers)
      .where(eq(merchantTeamMembers.merchantId, id));

    // Get webhooks count
    const [webhookStats] = await db
      .select({ total: count() })
      .from(webhookConfigurations)
      .where(eq(webhookConfigurations.merchantId, id));

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
          bankAccounts: bankStats?.total || 0,
          apiKeys: keyStats?.total || 0,
          teamMembers: teamStats?.total || 0,
          webhooks: webhookStats?.total || 0,
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

const updateMerchantSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  companyName: z.string().optional(),
  companyLogoUrl: z.string().url().optional().nullable(),
  isActive: z.boolean().optional(),
  kycStatus: z.enum(['pending', 'approved', 'rejected']).optional(),
  role: z.enum(['merchant', 'admin']).optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postal_code: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  bankAccount: z.object({
    account_holder: z.string().optional(),
    account_number: z.string().optional(),
    account_type: z.enum(['savings', 'cheque', 'transmission', 'bond', 'investment']).optional(),
    bank_name: z.string().optional(),
    branch_code: z.string().optional(),
  }).optional(),
});

/**
 * PATCH /api/admin/merchants/[id]
 * Update merchant details (admin only)
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
    const updates = updateMerchantSchema.parse(body);

    const merchant = await db.query.users.findFirst({
      where: eq(users.id, id),
    });

    if (!merchant) {
      return NextResponse.json(
        { success: false, message: 'Merchant not found' },
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

/**
 * DELETE /api/admin/merchants/[id]
 * Soft-delete a merchant (admin only)
 */
export async function DELETE(
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
      return NextResponse.json(
        { success: false, message: 'Merchant not found' },
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

    return NextResponse.json({
      success: true,
      message: 'Merchant deactivated successfully',
    });
  } catch (error: any) {
    console.error('Error deleting merchant:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to deactivate merchant' },
      { status: 500 }
    );
  }
}
