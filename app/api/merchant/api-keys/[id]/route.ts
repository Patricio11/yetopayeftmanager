/**
 * Individual API Key Management
 * 
 * Revoke specific API key
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireMerchant } from '@/lib/auth/authorization';
import { revokeApiKey } from '@/lib/auth/api-key';

/**
 * DELETE /api/merchant/api-keys/[id]
 * Revoke an API key
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireMerchant();
  if (!auth.authorized) return auth.response;
  
  try {
    const { id } = await params;
    
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
