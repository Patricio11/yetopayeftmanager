/**
 * Token Management API
 *
 * Allows merchants to view and manage saved credential tokens
 * (metadata only - no actual credentials)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireMerchant } from '@/lib/auth/authorization';
import { db } from '@/lib/db';
import { customerBankTokens, tokenizationAuditLog, eftBanks } from '@/lib/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

/**
 * GET - Retrieve all tokens for the authenticated merchant
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireMerchant();
    if (!auth.authorized) return auth.response;

    const merchantId = auth.session.user.id;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Fetch tokens with bank information
    const tokens = await db
      .select({
        id: customerBankTokens.id,
        bankCode: customerBankTokens.bankCode,
        bankName: eftBanks.bankName,
        bankColor: eftBanks.color,
        accountNumber: customerBankTokens.accountNumber,
        accountType: customerBankTokens.accountType,
        accountName: customerBankTokens.accountName,
        isDefault: customerBankTokens.isDefault,
        deviceFingerprint: customerBankTokens.deviceFingerprint,
        lastUsedAt: customerBankTokens.lastUsedAt,
        usageCount: customerBankTokens.usageCount,
        createdAt: customerBankTokens.createdAt,
        isActive: customerBankTokens.isActive,
      })
      .from(customerBankTokens)
      .leftJoin(eftBanks, eq(customerBankTokens.bankId, eftBanks.id))
      .where(
        and(
          eq(customerBankTokens.merchantId, merchantId),
          eq(customerBankTokens.isActive, true)
        )
      )
      .orderBy(desc(customerBankTokens.lastUsedAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(customerBankTokens)
      .where(
        and(
          eq(customerBankTokens.merchantId, merchantId),
          eq(customerBankTokens.isActive, true)
        )
      );

    // Get statistics
    const stats = await db
      .select({
        totalTokens: sql<number>`count(*)`,
        totalCustomers: sql<number>`count(distinct ${customerBankTokens.deviceFingerprint})`,
        totalUsage: sql<number>`sum(${customerBankTokens.usageCount})`,
        defaultTokens: sql<number>`sum(case when ${customerBankTokens.isDefault} then 1 else 0 end)`,
      })
      .from(customerBankTokens)
      .where(
        and(
          eq(customerBankTokens.merchantId, merchantId),
          eq(customerBankTokens.isActive, true)
        )
      );

    return NextResponse.json({
      success: true,
      tokens,
      pagination: {
        page,
        limit,
        total: Number(count),
        totalPages: Math.ceil(Number(count) / limit),
      },
      stats: stats[0],
    });
  } catch (error) {
    console.error('Error fetching tokens:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tokens' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete a specific token (soft delete)
 */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireMerchant();
    if (!auth.authorized) return auth.response;

    const merchantId = auth.session.user.id;
    const { searchParams } = new URL(request.url);
    const tokenId = searchParams.get('tokenId');

    if (!tokenId) {
      return NextResponse.json(
        { success: false, error: 'Token ID required' },
        { status: 400 }
      );
    }

    // Verify token belongs to merchant
    const [token] = await db
      .select()
      .from(customerBankTokens)
      .where(
        and(
          eq(customerBankTokens.id, tokenId),
          eq(customerBankTokens.merchantId, merchantId)
        )
      )
      .limit(1);

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token not found' },
        { status: 404 }
      );
    }

    // Soft delete
    await db
      .update(customerBankTokens)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(customerBankTokens.id, tokenId));

    // Log deletion
    await db.insert(tokenizationAuditLog).values({
      tokenId,
      merchantId,
      action: 'deleted',
      ipAddress: request.headers.get('x-forwarded-for') ||
                 request.headers.get('x-real-ip') ||
                 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      deviceFingerprint: token.deviceFingerprint,
      metadata: { deletedBy: auth.session.user.email || merchantId },
    });

    return NextResponse.json({
      success: true,
      message: 'Token deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting token:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete token' },
      { status: 500 }
    );
  }
}
