import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { customerBankTokens, tokenizationAuditLog, eftBanks } from '@/lib/db/schema';
import { 
  encryptCredentials, 
  decryptCredentials, 
  hashCredentials,
  generateDeviceFingerprint,
  validateCredentials,
  sanitizeCredentialsForLog
} from '@/lib/security/credential-encryption';
import { eq, and, desc } from 'drizzle-orm';

/**
 * GET /api/tokenization
 * Retrieve saved bank credentials for a customer
 * Query params: merchantId, customerEmail, deviceFingerprint
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get('merchantId');
    const customerEmail = searchParams.get('customerEmail');
    const deviceFingerprint = searchParams.get('deviceFingerprint');

    if (!merchantId || !customerEmail || !deviceFingerprint) {
      return NextResponse.json(
        { success: false, message: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Find active tokens for this merchant + customer + device
    const tokens = await db
      .select({
        id: customerBankTokens.id,
        bankCode: customerBankTokens.bankCode,
        bankId: customerBankTokens.bankId,
        customerName: customerBankTokens.customerName,
        lastUsedAt: customerBankTokens.lastUsedAt,
        createdAt: customerBankTokens.createdAt,
        // Join with bank details
        bankName: eftBanks.bankName,
        bankColor: eftBanks.color,
      })
      .from(customerBankTokens)
      .leftJoin(eftBanks, eq(customerBankTokens.bankId, eftBanks.id))
      .where(
        and(
          eq(customerBankTokens.merchantId, merchantId),
          eq(customerBankTokens.customerEmail, customerEmail.toLowerCase()),
          eq(customerBankTokens.deviceFingerprint, deviceFingerprint),
          eq(customerBankTokens.isActive, true)
        )
      )
      .orderBy(desc(customerBankTokens.lastUsedAt));

    return NextResponse.json({
      success: true,
      tokens: tokens.map(t => ({
        id: t.id,
        bankCode: t.bankCode,
        bankName: t.bankName,
        bankColor: t.bankColor,
        customerName: t.customerName,
        lastUsedAt: t.lastUsedAt,
        createdAt: t.createdAt,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching tokens:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch saved credentials' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tokenization
 * Save new bank credentials (tokenize)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      merchantId,
      customerEmail,
      customerName,
      bankCode,
      credentials,
      deviceFingerprint,
      deviceInfo,
    } = body;

    // Validation
    if (!merchantId || !customerEmail || !bankCode || !credentials || !deviceFingerprint) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!validateCredentials(credentials)) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials format' },
        { status: 400 }
      );
    }

    // Get bank info
    const bank = await db.query.eftBanks.findFirst({
      where: eq(eftBanks.code, bankCode),
    });

    if (!bank) {
      return NextResponse.json(
        { success: false, message: 'Bank not found' },
        { status: 404 }
      );
    }

    // Check if credentials already exist (using hash)
    const credentialHash = hashCredentials(credentials);
    const existingToken = await db.query.customerBankTokens.findFirst({
      where: and(
        eq(customerBankTokens.merchantId, merchantId),
        eq(customerBankTokens.customerEmail, customerEmail.toLowerCase()),
        eq(customerBankTokens.credentialHash, credentialHash),
        eq(customerBankTokens.isActive, true)
      ),
    });

    if (existingToken) {
      // Update last used timestamp
      await db
        .update(customerBankTokens)
        .set({
          lastUsedAt: new Date(),
          usageCount: String(parseInt(existingToken.usageCount || '0') + 1),
          updatedAt: new Date(),
        })
        .where(eq(customerBankTokens.id, existingToken.id));

      // Log usage
      await db.insert(tokenizationAuditLog).values({
        tokenId: existingToken.id,
        merchantId,
        customerEmail: customerEmail.toLowerCase(),
        action: 'used',
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || undefined,
        deviceFingerprint,
      });

      return NextResponse.json({
        success: true,
        message: 'Credentials already saved',
        tokenId: existingToken.id,
        isNew: false,
      });
    }

    // Encrypt credentials
    const encryptedCredentials = encryptCredentials(credentials);

    // Calculate expiry (90 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);

    // Save new token
    const [newToken] = await db
      .insert(customerBankTokens)
      .values({
        merchantId,
        customerEmail: customerEmail.toLowerCase(),
        customerName: customerName || null,
        bankId: bank.id,
        bankCode,
        encryptedCredentials,
        credentialHash,
        deviceFingerprint,
        deviceInfo: deviceInfo || {},
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        isActive: true,
        expiresAt,
        lastUsedAt: new Date(),
        usageCount: '1',
      })
      .returning();

    // Log creation
    await db.insert(tokenizationAuditLog).values({
      tokenId: newToken.id,
      merchantId,
      customerEmail: customerEmail.toLowerCase(),
      action: 'created',
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
      deviceFingerprint,
      metadata: {
        bankCode,
        sanitizedCredentials: sanitizeCredentialsForLog(credentials),
      },
    });

    console.log(`✅ Credentials tokenized for ${customerEmail} at ${bank.bankName}`);

    return NextResponse.json({
      success: true,
      message: 'Credentials saved successfully',
      tokenId: newToken.id,
      isNew: true,
    });
  } catch (error: any) {
    console.error('Error saving token:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to save credentials' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tokenization/[tokenId]
 * Delete a saved credential token
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenId = searchParams.get('tokenId');
    const merchantId = searchParams.get('merchantId');
    const customerEmail = searchParams.get('customerEmail');

    if (!tokenId || !merchantId || !customerEmail) {
      return NextResponse.json(
        { success: false, message: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Verify ownership before deletion
    const token = await db.query.customerBankTokens.findFirst({
      where: and(
        eq(customerBankTokens.id, tokenId),
        eq(customerBankTokens.merchantId, merchantId),
        eq(customerBankTokens.customerEmail, customerEmail.toLowerCase())
      ),
    });

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Token not found or access denied' },
        { status: 404 }
      );
    }

    // Soft delete (mark as inactive)
    await db
      .update(customerBankTokens)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(customerBankTokens.id, tokenId));

    // Log deletion
    await db.insert(tokenizationAuditLog).values({
      tokenId,
      merchantId,
      customerEmail: customerEmail.toLowerCase(),
      action: 'deleted',
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || undefined,
    });

    console.log(`🗑️ Token deleted: ${tokenId}`);

    return NextResponse.json({
      success: true,
      message: 'Credentials deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting token:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete credentials' },
      { status: 500 }
    );
  }
}
