import { auth } from "./auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Get current session from server components
 * Better Auth handles authentication internally
 */
export async function getSession() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    return session;
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
export async function requireRole(role: "admin" | "merchant") {
  const session = await requireAuth();
  
  // Type assertion for custom user fields
  const userRole = (session.user as any).role;
  
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
  
  // Type assertion for custom user fields
  const userRole = (session.user as any).role;
  
  // Admin has all permissions
  if (userRole === "admin") return true;
  
  // TODO: Check user permissions from database
  return false;
}
