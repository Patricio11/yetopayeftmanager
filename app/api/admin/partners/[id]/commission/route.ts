import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/authorization';
import { db } from '@/lib/db';
import { eftPartnerFees } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { writeAuditLog } from '@/lib/audit';

/**
 * GET /api/admin/partners/[id]/commission
 * Get partner fee/commission configuration
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  try {
    const feeConfig = await db.query.eftPartnerFees.findFirst({
      where: eq(eftPartnerFees.partnerId, id),
    });

    // Return defaults if no config exists
    const data = feeConfig || {
      partnerId: id,
      commissionMode: 'handle_outside',
      feeType: 'fixed',
      fixedFeeValue: null,
      percentageFeeValue: null,
      volumeFeeValue: null,
      vatEnabled: null,
      vatRate: null,
      isActive: true,
    };

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('Error fetching partner commission:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch partner commission config' },
      { status: 500 }
    );
  }
}

const upsertCommissionSchema = z.object({
  commissionMode: z.enum(['handle_outside', 'commission']),
  feeType: z.enum(['fixed', 'percentage', 'volume']).optional(),
  fixedFeeValue: z.string().optional().nullable(),
  percentageFeeValue: z.string().optional().nullable(),
  volumeFeeValue: z.string().optional().nullable(),
  vatEnabled: z.boolean().optional().nullable(),
  vatRate: z.string().optional().nullable(),
});

/**
 * PUT /api/admin/partners/[id]/commission
 * Upsert partner commission configuration
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  try {
    const body = await request.json();
    const validatedData = upsertCommissionSchema.parse(body);

    const now = new Date();

    const [result] = await db
      .insert(eftPartnerFees)
      .values({
        partnerId: id,
        commissionMode: validatedData.commissionMode,
        feeType: validatedData.feeType,
        fixedFeeValue: validatedData.fixedFeeValue,
        percentageFeeValue: validatedData.percentageFeeValue,
        volumeFeeValue: validatedData.volumeFeeValue,
        vatEnabled: validatedData.vatEnabled,
        vatRate: validatedData.vatRate,
        isActive: true,
        createdAt: now,
        updatedAt: now,
        createdBy: auth.session.user.id,
        updatedBy: auth.session.user.id,
      })
      .onConflictDoUpdate({
        target: eftPartnerFees.partnerId,
        set: {
          commissionMode: validatedData.commissionMode,
          feeType: validatedData.feeType,
          fixedFeeValue: validatedData.fixedFeeValue,
          percentageFeeValue: validatedData.percentageFeeValue,
          volumeFeeValue: validatedData.volumeFeeValue,
          vatEnabled: validatedData.vatEnabled,
          vatRate: validatedData.vatRate,
          updatedAt: now,
          updatedBy: auth.session.user.id,
        },
      })
      .returning();

    writeAuditLog({ userId: auth.session.user.id, action: "update", resource: "partner_commission", resourceId: id, changes: { after: validatedData }, request });

    return NextResponse.json({
      success: true,
      message: 'Partner commission config updated successfully',
      data: result,
    });
  } catch (error: any) {
    console.error('Error upserting partner commission:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Failed to update partner commission config' },
      { status: 500 }
    );
  }
}
