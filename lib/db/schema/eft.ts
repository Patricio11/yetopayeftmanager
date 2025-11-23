import { pgTable, uuid, text, numeric, timestamp, boolean, jsonb, integer, index } from "drizzle-orm/pg-core";
import { users } from "./users";

// EFT Banks
export const eftBanks = pgTable("eft_banks", {
  id: uuid("id").defaultRandom().primaryKey(),
  bankName: text("bank_name").notNull(),
  code: text("code").notNull().unique(),
  color: text("color"), // Brand color for UI
  branchCode: text("branch_code"),
  enabled: boolean("enabled").default(true),
  displayOrder: integer("display_order").default(0), // Order for display in payment page
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  displayOrderIdx: index("eft_banks_display_order_idx").on(table.displayOrder),
}));

// EFT Transactions
export const eftTransactions = pgTable("eft_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  merchantId: text("merchant_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  reference: text("reference").notNull().unique(),
  eftBankId: uuid("eft_bank_id").references(() => eftBanks.id),
  
  // URLs
  notifyUrl: text("notify_url"),
  successUrl: text("success_url"),
  failureUrl: text("failure_url"),
  cancelledUrl: text("cancelled_url"),
  abortedUrl: text("aborted_url"),
  
  // Description
  description: text("description"),
  
  // Status
  status: text("status", { 
    enum: ["not_started", "initiated", "completed", "failed", "aborted", "cancelled", "expired"] 
  }).default("not_started"),
  
  // Customer info (optional)
  customerEmail: text("customer_email"),
  customerName: text("customer_name"),
  
  // T&C
  tcAccepted: boolean("tc_accepted").default(false),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  
  // Metadata
  metadata: jsonb("metadata").default({}),
  
  // Legacy token field (for backward compatibility)
  token: text("token"),
}, (table) => ({
  merchantIdx: index("eft_transaction_merchant_idx").on(table.merchantId),
  statusIdx: index("eft_transaction_status_idx").on(table.status),
  referenceIdx: index("eft_transaction_reference_idx").on(table.reference),
}));

// Payment Tokens (NEW - SECURITY ENHANCEMENT)
export const paymentTokens = pgTable("payment_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  tokenHash: text("token_hash").notNull().unique(), // SHA-256 hash of token
  transactionId: uuid("transaction_id")
    .notNull()
    .references(() => eftTransactions.id, { onDelete: "cascade" }),
  merchantId: text("merchant_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  
  // Token details
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"), // For single-use tokens
  isRevoked: boolean("is_revoked").default(false),
  
  // Access tracking
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  accessCount: integer("access_count").default(0),
  lastAccessedAt: timestamp("last_accessed_at"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  tokenHashIdx: index("payment_token_hash_idx").on(table.tokenHash),
  transactionIdx: index("payment_token_transaction_idx").on(table.transactionId),
  expiresAtIdx: index("payment_token_expires_idx").on(table.expiresAt),
}));

// EFT Bank Accounts (Merchant's bank accounts)
export const eftBankAccounts = pgTable("eft_bank_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  merchantId: text("merchant_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  eftBanksId: uuid("eft_banks_id").references(() => eftBanks.id),
  
  // Account details
  accountNumber: text("account_number").notNull(),
  accountHolderName: text("account_holder_name").notNull(),
  accountName: text("account_name"),
  accountType: text("account_type", { 
    enum: ["savings", "cheque", "transmission", "bond", "investment"] 
  }).default("cheque"),
  
  // Branch info
  branchCode: text("branch_code"),
  branchName: text("branch_name"),
  bankCode: text("bank_code"), // Bank code for EFT
  
  // Status
  isPrimary: boolean("is_primary").default(false),
  isVerified: boolean("is_verified").default(false),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  merchantIdx: index("eft_bank_account_merchant_idx").on(table.merchantId),
}));

// EFT Settings (per merchant)
export const eftSettings = pgTable("eft_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  merchantId: text("merchant_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  
  // Enabled banks for this merchant
  banksEnabled: jsonb("banks_enabled").$type<string[]>().default([]),
  
  // Default settings
  defaultExpiryHours: integer("default_expiry_hours").default(24),
  singleUseTokens: boolean("single_use_tokens").default(false),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Type exports
export type EftBank = typeof eftBanks.$inferSelect;
export type NewEftBank = typeof eftBanks.$inferInsert;
export type EftTransaction = typeof eftTransactions.$inferSelect;
export type NewEftTransaction = typeof eftTransactions.$inferInsert;
export type PaymentToken = typeof paymentTokens.$inferSelect;
export type NewPaymentToken = typeof paymentTokens.$inferInsert;
export type EftBankAccount = typeof eftBankAccounts.$inferSelect;
export type NewEftBankAccount = typeof eftBankAccounts.$inferInsert;
export type EftSettings = typeof eftSettings.$inferSelect;
