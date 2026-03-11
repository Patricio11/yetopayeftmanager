import { auth } from "./auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

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
  };
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
    token: string;
    ipAddress?: string;
    userAgent?: string;
  };
};

/**
 * Get current session from server components
 * Better Auth handles authentication internally
 */
export async function getSession(): Promise<ExtendedSession | null> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    return session as ExtendedSession | null;
  } catch (error) {
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
