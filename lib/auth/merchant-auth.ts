/**
 * Unified Merchant Authentication
 *
 * Provides a single function that handles both:
 * 1. API key authentication (server-to-server)
 * 2. Session authentication (dashboard UI)
 *
 * Usage in any API route:
 *   const auth = await authenticateMerchant(request, 'transactions.read');
 *   if (!auth.success) return auth.response;
 *   const merchantId = auth.merchantId;
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { authenticateApiRequest, requirePermission } from "./api-middleware";

export interface MerchantAuthResult {
  success: boolean;
  merchantId: string;
  authMethod: "api_key" | "session";
  permissions?: string[];
  response?: never;
}

export interface MerchantAuthError {
  success: false;
  merchantId?: never;
  authMethod?: never;
  permissions?: never;
  response: NextResponse;
}

type AuthResult = MerchantAuthResult | MerchantAuthError;

/**
 * Authenticate a merchant request via API key or session.
 *
 * @param request  - The incoming Next.js request
 * @param permission - Optional permission to require (e.g. 'transactions.read').
 *                     Only enforced for API key auth; session users get full access.
 */
export async function authenticateMerchant(
  request: NextRequest,
  permission?: string
): Promise<AuthResult> {
  const authHeader = request.headers.get("authorization");

  // ── API Key Path ──────────────────────────────────────────────────────
  if (authHeader && authHeader.startsWith("Bearer yp_")) {
    const apiAuth = await authenticateApiRequest(request);

    if (!apiAuth.authenticated) {
      return { success: false, response: apiAuth.response! };
    }

    // Check permission if required
    if (permission) {
      const permCheck = requirePermission(apiAuth.permissions!, permission);
      if (!permCheck.authorized) {
        return { success: false, response: permCheck.response! };
      }
    }

    return {
      success: true,
      merchantId: apiAuth.merchantId!,
      authMethod: "api_key",
      permissions: apiAuth.permissions,
    };
  }

  // ── Session Path ──────────────────────────────────────────────────────
  const session = await getSession();

  if (!session) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Unauthorized", message: "Authentication required. Use API key or sign in." },
        { status: 401 }
      ),
    };
  }

  return {
    success: true,
    merchantId: session.user.id,
    authMethod: "session",
  };
}
