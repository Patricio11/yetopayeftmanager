/**
 * Tokenization Metadata API
 * 
 * This API handles ONLY metadata storage (no credentials).
 * Actual credentials are stored encrypted in browser localStorage.
 * 
 * This approach is:
 * - PCI DSS friendly (no credentials on server)
 * - User-controlled (browser storage)
 * - Audit-friendly (metadata for compliance)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { customerBankTokens, tokenizationAuditLog } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { verifyPaymentToken } from '@/lib/security/payment-token';

/**
 * GET - Retrieve metadata for saved credentials
 * Returns list of saved credential metadata (no actual credentials)
 * paymentToken is sent via Authorization header to avoid URL logging/caching
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get('merchantId');
    const deviceFingerprint = searchParams.get('deviceFingerprint');

    if (!merchantId || !deviceFingerprint) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Verify payment token from Authorization header (not query params to avoid logging)
    const paymentToken = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!paymentToken) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    try {
      await verifyPaymentToken(paymentToken, ipAddress, userAgent);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired payment token' },
        { status: 401 }
      );
    }

    // Fetch metadata from database
    const tokens = await db
      .select()
      .from(customerBankTokens)
      .where(
        and(
          eq(customerBankTokens.merchantId, merchantId),
          eq(customerBankTokens.deviceFingerprint, deviceFingerprint),
          eq(customerBankTokens.isActive, true)
        )
      )
      .orderBy(customerBankTokens.isDefault, customerBankTokens.lastUsedAt);

    return NextResponse.json({
      success: true,
      tokens: tokens.map(token => ({
        id: token.id,
        bankCode: token.bankCode,
        accountNumber: token.accountNumber, // Last 4 digits only
        accountType: token.accountType,
        accountName: token.accountName,
        isDefault: token.isDefault,
        lastUsedAt: token.lastUsedAt,
        usageCount: token.usageCount,
        createdAt: token.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching token metadata:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch token metadata' },
      { status: 500 }
    );
  }
}

/**
 * POST - Save or update metadata for credentials
 * Called after successful payment when user opts to save credentials
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      merchantId,
      bankCode,
      deviceFingerprint,
      deviceInfo,
      accountInfo, // { accountNumber, accountType, accountName }
      isDefault,
      paymentToken,
    } = body;

    if (!merchantId || !bankCode || !deviceFingerprint) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify payment token for authentication
    if (!paymentToken) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    try {
      await verifyPaymentToken(paymentToken, ipAddress, userAgent);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired payment token' },
        { status: 401 }
      );
    }

    // Check if metadata already exists
    const existing = await db
      .select()
      .from(customerBankTokens)
      .where(
        and(
          eq(customerBankTokens.merchantId, merchantId),
          eq(customerBankTokens.bankCode, bankCode),
          eq(customerBankTokens.deviceFingerprint, deviceFingerprint)
        )
      )
      .limit(1);

    let tokenId: string;
    let isNew = false;

    if (existing.length > 0) {
      // Update existing metadata
      tokenId = existing[0].id;
      await db
        .update(customerBankTokens)
        .set({
          lastUsedAt: new Date(),
          usageCount: (existing[0].usageCount || 0) + 1,
          accountNumber: accountInfo?.accountNumber || existing[0].accountNumber,
          accountType: accountInfo?.accountType || existing[0].accountType,
          accountName: accountInfo?.accountName || existing[0].accountName,
          isDefault: isDefault !== undefined ? isDefault : existing[0].isDefault,
          updatedAt: new Date(),
        })
        .where(eq(customerBankTokens.id, tokenId));

      // Log usage
      await db.insert(tokenizationAuditLog).values({
        tokenId,
        merchantId,
        action: 'used',
        ipAddress,
        userAgent: request.headers.get('user-agent') || undefined,
        deviceFingerprint,
        metadata: { accountInfo },
      });
    } else {
      // Create new metadata entry
      isNew = true;
      const [newToken] = await db
        .insert(customerBankTokens)
        .values({
          merchantId,
          bankCode,
          deviceFingerprint,
          deviceInfo,
          ipAddress,
          accountNumber: accountInfo?.accountNumber,
          accountType: accountInfo?.accountType,
          accountName: accountInfo?.accountName,
          isDefault: isDefault || false,
          lastUsedAt: new Date(),
          usageCount: 1,
          isActive: true,
        })
        .returning();

      tokenId = newToken.id;

      // Log creation
      await db.insert(tokenizationAuditLog).values({
        tokenId,
        merchantId,
        action: 'created',
        ipAddress,
        userAgent: request.headers.get('user-agent') || undefined,
        deviceFingerprint,
        metadata: { accountInfo },
      });
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await db
        .update(customerBankTokens)
        .set({ isDefault: false })
        .where(
          and(
            eq(customerBankTokens.merchantId, merchantId),
            eq(customerBankTokens.deviceFingerprint, deviceFingerprint),
            eq(customerBankTokens.isActive, true)
          )
        );
      
      await db
        .update(customerBankTokens)
        .set({ isDefault: true })
        .where(eq(customerBankTokens.id, tokenId));
    }

    return NextResponse.json({
      success: true,
      tokenId,
      isNew,
      message: isNew ? 'Metadata saved successfully' : 'Metadata updated successfully',
    });
  } catch (error) {
    console.error('Error saving token metadata:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save token metadata' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove metadata (user deletes saved credentials)
 * Reads from request body to avoid sensitive data in URL query params
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { tokenId, merchantId, deviceFingerprint = 'unknown' } = body;

    if (!tokenId || !merchantId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Verify payment token from Authorization header
    const paymentToken = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!paymentToken) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    const ipAddress = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') ||
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    try {
      await verifyPaymentToken(paymentToken, ipAddress, userAgent);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired payment token' },
        { status: 401 }
      );
    }

    // Soft delete (set isActive to false)
    await db
      .update(customerBankTokens)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(customerBankTokens.id, tokenId),
          eq(customerBankTokens.merchantId, merchantId)
        )
      );

    // Log deletion
    await db.insert(tokenizationAuditLog).values({
      tokenId,
      merchantId,
      action: 'deleted',
      ipAddress,
      userAgent: request.headers.get('user-agent') || undefined,
      deviceFingerprint,
    });

    return NextResponse.json({
      success: true,
      message: 'Metadata deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting token metadata:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete token metadata' },
      { status: 500 }
    );
  }
}
