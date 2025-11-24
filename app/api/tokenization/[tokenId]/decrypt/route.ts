import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { customerBankTokens, tokenizationAuditLog } from '@/lib/db/schema';
import { decryptCredentials } from '@/lib/security/credential-encryption';
import { eq, and } from 'drizzle-orm';

interface RouteContext {
  params: Promise<{
    tokenId: string;
  }>;
}

/**
 * POST /api/tokenization/[tokenId]/decrypt
 * Decrypt and return saved credentials for use in payment flow
 * Requires verification of merchant, customer, and device
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { tokenId } = await context.params;
    const body = await request.json();
    const { merchantId, customerEmail, deviceFingerprint } = body;

    if (!merchantId || !customerEmail || !deviceFingerprint) {
      return NextResponse.json(
        { success: false, message: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Find and verify token
    const token = await db.query.customerBankTokens.findFirst({
      where: and(
        eq(customerBankTokens.id, tokenId),
        eq(customerBankTokens.merchantId, merchantId),
        eq(customerBankTokens.customerEmail, customerEmail.toLowerCase()),
        eq(customerBankTokens.deviceFingerprint, deviceFingerprint),
        eq(customerBankTokens.isActive, true)
      ),
    });

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Token not found or access denied' },
        { status: 404 }
      );
    }

    // Check expiry
    if (token.expiresAt && new Date(token.expiresAt) < new Date()) {
      // Mark as expired
      await db
        .update(customerBankTokens)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(customerBankTokens.id, tokenId));

      // Log expiry
      await db.insert(tokenizationAuditLog).values({
        tokenId,
        merchantId,
        customerEmail: customerEmail.toLowerCase(),
        action: 'expired',
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || undefined,
        deviceFingerprint,
      });

      return NextResponse.json(
        { success: false, message: 'Token has expired' },
        { status: 410 }
      );
    }

    // Decrypt credentials
    let credentials: Record<string, any>;
    try {
      credentials = decryptCredentials(token.encryptedCredentials);
    } catch (error) {
      console.error('Decryption failed:', error);
      
      // Log failed auth
      await db.insert(tokenizationAuditLog).values({
        tokenId,
        merchantId,
        customerEmail: customerEmail.toLowerCase(),
        action: 'failed_auth',
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || undefined,
        deviceFingerprint,
        metadata: { error: 'Decryption failed' },
      });

      return NextResponse.json(
        { success: false, message: 'Failed to decrypt credentials' },
        { status: 500 }
      );
    }

    // Update usage stats
    await db
      .update(customerBankTokens)
      .set({
        lastUsedAt: new Date(),
        usageCount: String(parseInt(token.usageCount || '0') + 1),
        updatedAt: new Date(),
        // Extend expiry by 90 days on each use
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      })
      .where(eq(customerBankTokens.id, tokenId));

    // Log usage
    await db.insert(tokenizationAuditLog).values({
      tokenId,
      merchantId,
      customerEmail: customerEmail.toLowerCase(),
      action: 'used',
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      deviceFingerprint,
    });

    console.log(`🔓 Credentials decrypted for ${customerEmail} (token: ${tokenId})`);

    return NextResponse.json({
      success: true,
      credentials,
      bankCode: token.bankCode,
      customerName: token.customerName,
    });
  } catch (error: any) {
    console.error('Error decrypting token:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve credentials' },
      { status: 500 }
    );
  }
}
