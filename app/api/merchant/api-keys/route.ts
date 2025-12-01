/**
 * API Keys Management
 * 
 * Merchants can create, list, and revoke API keys
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireMerchant } from '@/lib/auth/authorization';
import { generateApiKey, listApiKeys, revokeApiKey } from '@/lib/auth/api-key';
import { z } from 'zod';

const createKeySchema = z.object({
  name: z.string().min(1).max(100),
  expiresInDays: z.number().positive().max(365).optional(),
});

/**
 * POST /api/merchant/api-keys
 * Create a new API key
 */
export async function POST(request: NextRequest) {
  const auth = await requireMerchant();
  if (!auth.authorized) return auth.response;
  
  try {
    const body = await request.json();
    const { name, expiresInDays } = createKeySchema.parse(body);
    
    // Generate API key
    const apiKeyData = await generateApiKey(
      auth.session.user.id,
      name
    );
    
    return NextResponse.json({
      success: true,
      message: 'API key created successfully',
      data: {
        id: apiKeyData.id,
        apiKey: apiKeyData.apiKey,
        apiSecret: apiKeyData.apiSecret,
        keyPrefix: apiKeyData.keyPrefix,
        createdAt: apiKeyData.createdAt,
        warning: apiKeyData.warning,
      },
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('Error creating API key:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.issues,
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to create API key',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/merchant/api-keys
 * List all API keys for merchant
 */
export async function GET(request: NextRequest) {
  const auth = await requireMerchant();
  if (!auth.authorized) return auth.response;
  
  try {
    const keys = await listApiKeys(auth.session.user.id);
    
    return NextResponse.json({
      success: true,
      data: keys,
    });
    
  } catch (error: any) {
    console.error('Error listing API keys:', error);
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to list API keys',
      },
      { status: 500 }
    );
  }
}
