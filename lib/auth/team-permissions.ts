import { db } from "@/lib/db";
import { merchantTeamMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export const TEAM_PERMISSIONS = {
  TRANSACTIONS_VIEW: "transactions.view",
  TRANSACTIONS_CREATE: "transactions.create",
  SETTINGS_VIEW: "settings.view",
  SETTINGS_EDIT: "settings.edit",
  API_KEYS_MANAGE: "api-keys.manage",
  WEBHOOKS_MANAGE: "webhooks.manage",
  BANK_ACCOUNTS_MANAGE: "bank-accounts.manage",
  PAYMENT_LINKS_CREATE: "payment-links.create",
  ANALYTICS_VIEW: "analytics.view",
  TEAM_MANAGE: "team.manage",
} as const;

export type TeamPermission = (typeof TEAM_PERMISSIONS)[keyof typeof TEAM_PERMISSIONS];

export const TEAM_ROLES = {
  owner: {
    label: "Owner",
    description: "Full access to all features",
    defaultPermissions: Object.values(TEAM_PERMISSIONS),
  },
  admin: {
    label: "Admin",
    description: "Can manage settings, team, and transactions",
    defaultPermissions: [
      TEAM_PERMISSIONS.TRANSACTIONS_VIEW,
      TEAM_PERMISSIONS.TRANSACTIONS_CREATE,
      TEAM_PERMISSIONS.SETTINGS_VIEW,
      TEAM_PERMISSIONS.SETTINGS_EDIT,
      TEAM_PERMISSIONS.BANK_ACCOUNTS_MANAGE,
      TEAM_PERMISSIONS.PAYMENT_LINKS_CREATE,
      TEAM_PERMISSIONS.ANALYTICS_VIEW,
      TEAM_PERMISSIONS.TEAM_MANAGE,
    ],
  },
  user: {
    label: "User",
    description: "Can view transactions and create payment links",
    defaultPermissions: [
      TEAM_PERMISSIONS.TRANSACTIONS_VIEW,
      TEAM_PERMISSIONS.TRANSACTIONS_CREATE,
      TEAM_PERMISSIONS.PAYMENT_LINKS_CREATE,
      TEAM_PERMISSIONS.ANALYTICS_VIEW,
    ],
  },
} as const;

export const PERMISSION_LABELS: Record<TeamPermission, string> = {
  "transactions.view": "View Transactions",
  "transactions.create": "Create Transactions",
  "settings.view": "View Settings",
  "settings.edit": "Edit Settings",
  "api-keys.manage": "Manage API Keys",
  "webhooks.manage": "Manage Webhooks",
  "bank-accounts.manage": "Manage Bank Accounts",
  "payment-links.create": "Create Payment Links",
  "analytics.view": "View Analytics",
  "team.manage": "Manage Team",
};

/**
 * Resolve the effective merchant ID for the logged-in user.
 * If the user is a team member, returns the parent merchant's ID.
 * Otherwise returns the user's own ID.
 */
export async function getEffectiveMerchantId(userId: string): Promise<string> {
  const membership = await db.query.merchantTeamMembers.findFirst({
    where: and(
      eq(merchantTeamMembers.userId, userId),
      eq(merchantTeamMembers.status, "active")
    ),
  });

  return membership ? membership.merchantId : userId;
}

/**
 * Get the team membership for a user, if any.
 */
export async function getTeamMembership(userId: string) {
  return db.query.merchantTeamMembers.findFirst({
    where: and(
      eq(merchantTeamMembers.userId, userId),
      eq(merchantTeamMembers.status, "active")
    ),
  });
}

/**
 * Check if a team member has a specific permission.
 * Owners always have all permissions.
 */
export function hasPermission(
  membership: { role: string; permissions: string[] | null },
  permission: TeamPermission
): boolean {
  if (membership.role === "owner") return true;
  return (membership.permissions || []).includes(permission);
}
