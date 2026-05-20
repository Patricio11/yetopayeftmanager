import { NextResponse } from 'next/server';
import { getSession, getRealSession } from '@/lib/auth-server';

/**
 * Authorization helpers for role-based access control
 */

export async function requireAuth() {
  const session = await getSession();

  if (!session) {
    return {
      authorized: false as const,
      response: NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to access this resource' },
        { status: 401 }
      ),
    };
  }

  return {
    authorized: true as const,
    session,
  };
}

export async function requireAdmin() {
  // Use real session to bypass impersonation — admin endpoints must check the actual caller
  const session = await getRealSession();

  if (!session) {
    return {
      authorized: false as const,
      response: NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to access this resource' },
        { status: 401 }
      ),
    };
  }

  if ((session.user.role || 'merchant') !== 'admin') {
    return {
      authorized: false as const,
      response: NextResponse.json(
        { error: 'Forbidden', message: 'Admin access required' },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true as const,
    session,
  };
}

export async function requireMerchant() {
  const session = await getSession();
  
  if (!session) {
    return {
      authorized: false as const,
      response: NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to access this resource' },
        { status: 401 }
      ),
    };
  }

  if (!['admin', 'merchant'].includes(session.user.role || '')) {
    return {
      authorized: false as const,
      response: NextResponse.json(
        { error: 'Forbidden', message: 'Merchant access required' },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true as const,
    session,
  };
}

export async function requirePartner() {
  const session = await getSession();

  if (!session) {
    return {
      authorized: false as const,
      response: NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to access this resource' },
        { status: 401 }
      ),
    };
  }

  if (!['admin', 'partner'].includes(session.user.role || '')) {
    return {
      authorized: false as const,
      response: NextResponse.json(
        { error: 'Forbidden', message: 'Partner access required' },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true as const,
    session,
  };
}

export function isAdmin(role: string | null | undefined): boolean {
  return role === 'admin';
}

export function isPartner(role: string | null | undefined): boolean {
  if (!role) return false;
  return ['admin', 'partner'].includes(role);
}

export function isMerchant(role: string | null | undefined): boolean {
  if (!role) return false;
  return ['admin', 'merchant'].includes(role);
}
