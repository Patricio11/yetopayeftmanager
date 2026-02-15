import { pgTable, uuid, text, timestamp, jsonb, boolean, integer, index, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./users";

// Merchant Team Members
export const merchantTeamMembers = pgTable("merchant_team_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  merchantId: text("merchant_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Role & Permissions
  role: text("role", { enum: ["owner", "admin", "user"] }).notNull(),
  permissions: jsonb("permissions").$type<string[]>().default([]),
  
  // Invitation tracking
  invitedBy: text("invited_by").references(() => users.id),
  invitedAt: timestamp("invited_at").defaultNow(),
  acceptedAt: timestamp("accepted_at"),
  
  // Status
  status: text("status", { enum: ["pending", "active", "suspended"] }).default("pending"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  merchantIdx: index("team_member_merchant_idx").on(table.merchantId),
  userIdx: index("team_member_user_idx").on(table.userId),
  merchantUserUniq: uniqueIndex("team_member_merchant_user_uniq").on(table.merchantId, table.userId),
}));

// API Keys for merchant integration
export const apiKeys = pgTable("api_keys", {
  id: uuid("id").defaultRandom().primaryKey(),
  merchantId: text("merchant_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Key details
  name: text("name").notNull(),
  key: text("key").notNull().unique(), // Hashed
  secretHash: text("secret_hash"), // SHA-256 hash of API secret, used as HMAC key for signature verification
  keyPrefix: text("key_prefix").notNull(), // First 8 chars for display (e.g., "yp_live_")
  
  // Permissions
  permissions: jsonb("permissions").$type<string[]>().default([]),
  
  // Usage tracking
  lastUsedAt: timestamp("last_used_at"),
  usageCount: jsonb("usage_count").default({ total: 0, today: 0 }),
  
  // Expiration
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
  
  // Audit
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  revokedAt: timestamp("revoked_at"),
  revokedBy: text("revoked_by").references(() => users.id),
}, (table) => ({
  merchantIdx: index("api_key_merchant_idx").on(table.merchantId),
  keyIdx: index("api_key_key_idx").on(table.key),
}));

// Webhook Configurations
export const webhookConfigurations = pgTable("webhook_configurations", {
  id: uuid("id").defaultRandom().primaryKey(),
  merchantId: text("merchant_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Webhook details
  url: text("url").notNull(),
  events: jsonb("events").$type<string[]>().default([]), // ['transaction.completed', 'transaction.failed', etc.]
  secret: text("secret").notNull(), // For signature verification
  
  // Status
  isActive: boolean("is_active").default(true),
  
  // Retry policy
  retryPolicy: jsonb("retry_policy").$type<{
    maxRetries: number;
    backoffMultiplier: number;
  }>().default({ maxRetries: 3, backoffMultiplier: 2 }),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  merchantIdx: index("webhook_config_merchant_idx").on(table.merchantId),
  merchantUrlUniq: uniqueIndex("webhook_config_merchant_url_uniq").on(table.merchantId, table.url),
}));

// Webhook Deliveries (logs)
export const webhookDeliveries = pgTable("webhook_deliveries", {
  id: uuid("id").defaultRandom().primaryKey(),
  webhookConfigId: uuid("webhook_config_id").references(() => webhookConfigurations.id, { onDelete: "cascade" }),
  transactionId: uuid("transaction_id"),
  
  // Event details
  event: text("event").notNull(),
  payload: jsonb("payload"),
  
  // Response
  response: jsonb("response"),
  statusCode: integer("status_code"),
  success: boolean("success"),
  errorMessage: text("error_message"),
  
  // Retry tracking
  attemptNumber: integer("attempt_number").default(1),
  nextRetryAt: timestamp("next_retry_at"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  deliveredAt: timestamp("delivered_at"),
}, (table) => ({
  webhookConfigIdx: index("webhook_delivery_config_idx").on(table.webhookConfigId),
  transactionIdx: index("webhook_delivery_transaction_idx").on(table.transactionId),
}));

// Type exports
export type MerchantTeamMember = typeof merchantTeamMembers.$inferSelect;
export type NewMerchantTeamMember = typeof merchantTeamMembers.$inferInsert;
export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
export type WebhookConfiguration = typeof webhookConfigurations.$inferSelect;
export type NewWebhookConfiguration = typeof webhookConfigurations.$inferInsert;
export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;
export type NewWebhookDelivery = typeof webhookDeliveries.$inferInsert;
