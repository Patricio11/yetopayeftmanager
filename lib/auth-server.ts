import { auth } from "./auth";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";

const IMPERSONATE_COOKIE = 'yp_impersonate';

// Extended session type with custom fields
export type ExtendedSession = {
  user: {
    id: string;
    email: string;
    name: string;
    image?: string | null;
    emailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
    role?: string;
    accountMode?: string;
  };
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
    token: string;
    ipAddress?: string;
    userAgent?: string;
  };
  impersonating?: {
    adminId: string;
    adminName: string;
    adminEmail: string;
  };
};

/**
 * Get current session from server components.
 * If an admin is impersonating a user, swaps the user context
 * but preserves the admin's identity in session.impersonating.
 */
export async function getSession(): Promise<ExtendedSession | null> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session) return null;

    const extended = session as ExtendedSession;

    // Check for impersonation (admin only)
    if ((extended.user.role || 'merchant') === 'admin') {
      try {
        const cookieStore = await cookies();
        const targetId = cookieStore.get(IMPERSONATE_COOKIE)?.value;
        if (targetId) {
          const [target] = await db
            .select()
            .from(users)
            .where(eq(users.id, targetId))
            .limit(1);

          if (target && target.role !== 'admin') {
            const adminId = extended.user.id;
            const adminName = extended.user.name;
            const adminEmail = extended.user.email;

            extended.user = {
              ...extended.user,
              id: target.id,
              email: target.email,
              name: target.name,
              role: target.role || 'merchant',
              emailVerified: target.emailVerified,
              accountMode: (target as any).accountMode,
            };
            extended.impersonating = { adminId, adminName, adminEmail };
          }
        }
      } catch {
        // Cookie read can fail in some contexts — proceed without impersonation
      }
    }

    return extended;
  } catch (error) {
    return null;
  }
}

/**
 * Get the real admin session, bypassing impersonation.
 * Used by admin-only endpoints to verify the caller is truly an admin.
 */
export async function getRealSession(): Promise<ExtendedSession | null> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    return session as ExtendedSession | null;
  } catch {
    return null;
  }
}

/**
 * Require authentication - redirect to login if not authenticated
 */
export async function requireAuth() {
  const session = await getSession();
  
  if (!session) {
    redirect("/auth/login");
  }
  
  return session;
}

/**
 * Require specific role - redirect if user doesn't have required role
 */
export async function requireRole(role: "admin" | "merchant" | "partner"): Promise<ExtendedSession> {
  const session = await requireAuth();
  
  const userRole = session.user.role || "merchant";
  
  if (userRole !== role) {
    redirect("/unauthorized");
  }
  
  return session;
}

/**
 * Check if user has permission
 */
export async function hasPermission(permission: string): Promise<boolean> {
  const session = await getSession();
  
  if (!session) return false;
  
  const userRole = session.user.role || "merchant";
  
  // Admin has all permissions
  if (userRole === "admin") return true;
  
  // TODO: Check user permissions from database
  return false;
}
