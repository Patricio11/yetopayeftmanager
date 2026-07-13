/**
 * Individual API Key Management
 *
 * Revoke specific API key (merchants and partners)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireMerchantOrPartner } from '@/lib/auth/authorization';
import { revokeApiKey } from '@/lib/auth/api-key';
import { db } from '@/lib/db';
import { apiKeys } from '@/lib/db/schema/team';
import { eq, and } from 'drizzle-orm';

/**
 * DELETE /api/merchant/api-keys/[id]
 * Revoke an API key
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireMerchantOrPartner();
  if (!auth.authorized) return auth.response;

  try {
    const { id } = await params;

    // Only allow revoking keys that belong to the caller
    const [keyRecord] = await db
      .select({ id: apiKeys.id })
      .from(apiKeys)
      .where(and(eq(apiKeys.id, id), eq(apiKeys.merchantId, auth.session.user.id)))
      .limit(1);

    if (!keyRecord) {
      return NextResponse.json(
        { error: 'Not found', message: 'API key not found' },
        { status: 404 }
      );
    }

    // Revoke the key
    await revokeApiKey(id, auth.session.user.id);

    return NextResponse.json({
      success: true,
      message: 'API key revoked successfully',
    });

  } catch (error: any) {
    console.error('Error revoking API key:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to revoke API key',
      },
      { status: 500 }
    );
  }
}
