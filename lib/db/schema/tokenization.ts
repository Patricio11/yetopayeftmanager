import { pgTable, uuid, text, timestamp, boolean, jsonb, index, varchar, integer, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./users";
import { eftBanks } from "./eft";

/**
 * Customer Bank Tokens Table (METADATA ONLY - No Credentials)
 * Stores ONLY metadata about saved credentials for audit trail
 * Actual credentials are stored encrypted in browser localStorage
 * 
 * This approach is PCI DSS friendly and gives users full control
 */
export const customerBankTokens = pgTable('customer_bank_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Merchant Info
  merchantId: text('merchant_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Bank Info
  bankId: uuid('bank_id').references(() => eftBanks.id, { onDelete: 'set null' }),
  bankCode: varchar('bank_code', { length: 50 }).notNull(),
  
  // Account Info (optional, for display purposes only)
  accountNumber: varchar('account_number', { length: 50 }), // Last 4 digits only
  accountType: varchar('account_type', { length: 50 }),
  accountName: varchar('account_name', { length: 255 }),
  
  // Device & Security (for audit trail)
  deviceFingerprint: varchar('device_fingerprint', { length: 64 }).notNull(),
  deviceInfo: jsonb('device_info'), // Browser, OS, etc.
  ipAddress: varchar('ip_address', { length: 45 }),
  
  // Usage Tracking
  lastUsedAt: timestamp('last_used_at'),
  usageCount: integer('usage_count').default(0),
  
  // Default Account Flag
  isDefault: boolean('is_default').default(false),
  
  // Status
  isActive: boolean('is_active').default(true),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  merchantIdx: index('customer_tokens_merchant_idx').on(table.merchantId),
  bankCodeIdx: index('customer_tokens_bank_code_idx').on(table.bankCode),
  deviceFingerprintIdx: index('customer_tokens_device_fingerprint_idx').on(table.deviceFingerprint),
  merchantBankDeviceIdx: uniqueIndex('customer_tokens_unique_idx').on(table.merchantId, table.bankCode, table.deviceFingerprint),
}));

/**
 * Tokenization Audit Log
 * Track all tokenization events for security & compliance
 */
export const tokenizationAuditLog = pgTable("tokenization_audit_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  
  tokenId: uuid("token_id").references(() => customerBankTokens.id, { onDelete: "cascade" }),
  merchantId: text("merchant_id").notNull(),
  
  // Event details
  action: text("action", {
    enum: ["created", "used", "updated", "deleted", "expired", "failed_auth"]
  }).notNull(),
  
  // Context
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  deviceFingerprint: text("device_fingerprint"),
  
  // Additional data
  metadata: jsonb("metadata").default({}),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  tokenIdx: index("tokenization_audit_token_idx").on(table.tokenId),
  merchantIdx: index("tokenization_audit_merchant_idx").on(table.merchantId),
  actionIdx: index("tokenization_audit_action_idx").on(table.action),
}));

// Type exports
export type CustomerBankToken = typeof customerBankTokens.$inferSelect;
export type NewCustomerBankToken = typeof customerBankTokens.$inferInsert;
export type TokenizationAuditLog = typeof tokenizationAuditLog.$inferSelect;
export type NewTokenizationAuditLog = typeof tokenizationAuditLog.$inferInsert;
