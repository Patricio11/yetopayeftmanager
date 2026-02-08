/**
 * API Key Authentication Middleware
 * 
 * Validates API requests using API key + HMAC signature
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyApiKey } from './api-key';

export interface ApiAuthResult {
  authenticated: boolean;
  merchantId?: string;
  permissions?: string[];
  error?: string;
  response?: NextResponse;
}

/**
 * Authenticate API request using API key and signature
 * 
 * Expected headers:
 * - Authorization: Bearer yp_live_abc123...
 * - X-Merchant-ID: merchant-uuid
 * - X-Timestamp: 1638360000
 * - X-Signature: sha256=hmac-signature
 */
export async function authenticateApiRequest(
  request: NextRequest
): Promise<ApiAuthResult> {
  try {
    // 1. Extract headers
    const authHeader = request.headers.get('authorization');
    const merchantId = request.headers.get('x-merchant-id');
    const timestamp = request.headers.get('x-timestamp');
    const signature = request.headers.get('x-signature');
    
    // 2. Validate required headers
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        authenticated: false,
        error: 'Missing or invalid Authorization header',
        response: NextResponse.json(
          {
            error: 'Unauthorized',
            message: 'Missing or invalid Authorization header. Expected: Authorization: Bearer yp_live_...',
          },
          { status: 401 }
        ),
      };
    }
    
    if (!merchantId) {
      return {
        authenticated: false,
        error: 'Missing X-Merchant-ID header',
        response: NextResponse.json(
          {
            error: 'Unauthorized',
            message: 'Missing X-Merchant-ID header',
          },
          { status: 401 }
        ),
      };
    }
    
    if (!timestamp) {
      return {
        authenticated: false,
        error: 'Missing X-Timestamp header',
        response: NextResponse.json(
          {
            error: 'Unauthorized',
            message: 'Missing X-Timestamp header. Use Unix timestamp.',
          },
          { status: 401 }
        ),
      };
    }
    
    if (!signature) {
      return {
        authenticated: false,
        error: 'Missing X-Signature header',
        response: NextResponse.json(
          {
            error: 'Unauthorized',
            message: 'Missing X-Signature header',
          },
          { status: 401 }
        ),
      };
    }
    
    // 3. Extract API key from Bearer token
    const apiKey = authHeader.substring(7); // Remove 'Bearer '
    
    // 4. Get request body for signature verification
    // Clone body text so downstream handlers can still call request.json()
    const requestBody = await request.clone().text();
    
    // 5. Verify API key and signature
    const verification = await verifyApiKey(
      apiKey,
      merchantId,
      timestamp,
      signature,
      requestBody
    );
    
    if (!verification.valid) {
      return {
        authenticated: false,
        error: verification.error,
        response: NextResponse.json(
          {
            error: 'Unauthorized',
            message: verification.error || 'Invalid API credentials',
          },
          { status: 401 }
        ),
      };
    }
    
    // 6. Success
    return {
      authenticated: true,
      merchantId: verification.merchantId,
      permissions: verification.permissions,
    };
    
  } catch (error: any) {
    console.error('API authentication error:', error);
    return {
      authenticated: false,
      error: 'Authentication failed',
      response: NextResponse.json(
        {
          error: 'Internal server error',
          message: 'Failed to authenticate request',
        },
        { status: 500 }
      ),
    };
  }
}

/**
 * Check if merchant has required permission
 */
export function hasPermission(
  permissions: string[],
  required: string
): boolean {
  return permissions.includes(required) || permissions.includes('*');
}

/**
 * Require specific permission
 */
export function requirePermission(
  permissions: string[],
  required: string
): { authorized: boolean; response?: NextResponse } {
  if (!hasPermission(permissions, required)) {
    return {
      authorized: false,
      response: NextResponse.json(
        {
          error: 'Forbidden',
          message: `Missing required permission: ${required}`,
        },
        { status: 403 }
      ),
    };
  }
  
  return { authorized: true };
}
