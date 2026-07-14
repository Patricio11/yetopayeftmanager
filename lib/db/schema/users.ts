import { pgTable, text, boolean, timestamp, numeric, jsonb, integer } from "drizzle-orm/pg-core";

// Users table - integrated with Better Auth
export const users = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  
  // YetoPay specific fields
  fullName: text("full_name"),
  phone: text("phone"),
  role: text("role", { enum: ["merchant", "admin", "partner"] }).default("merchant"),
  companyName: text("company_name"),
  companyLogoUrl: text("company_logo_url"),

  // Partner relationship (merchants linked to a partner)
  partnerId: text("partner_id"),
  
  // Address
  address: jsonb("address").$type<{
    street?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  }>().default({}),
  
  // Bank account
  bankAccount: jsonb("bank_account").$type<{
    account_holder?: string;
    account_number?: string;
    account_type?: "savings" | "cheque" | "transmission" | "bond" | "investment";
    bank_name?: string;
    branch_code?: string;
  }>().default({}),
  
  // KYC & Vetting
  kycStatus: text("kyc_status", { enum: ["pending", "pending_review", "approved", "rejected"] }).default("pending"),
  kycData: jsonb("kyc_data").$type<Record<string, any>>().default({}),
  kycSubmittedAt: timestamp("kyc_submitted_at"),
  vettingStatus: text("vetting_status", {
    enum: ["EMAIL_PENDING", "ONBOARDING_PENDING", "PENDING_REVIEW", "APPROVED", "REJECTED"],
  }).default("APPROVED"),
  vettingRejectionReason: text("vetting_rejection_reason"),
  vettingAdminNote: text("vetting_admin_note"),
  vettingReviewedAt: timestamp("vetting_reviewed_at"),
  vettingReviewedBy: text("vetting_reviewed_by"),
  companyReg: text("company_reg"),
  companyAddress: text("company_address"),
  companyCountry: text("company_country"),
  vatNumber: text("vat_number"),

  // Status
  isActive: boolean("is_active").default(true),
  accountMode: text("account_mode", { enum: ["demo", "live"] }).default("demo"),
  lastLogin: timestamp("last_login"),
  
  // Financial
  balance: numeric("balance", { precision: 10, scale: 2 }).default("0"),
  withdrawableBalance: numeric("withdrawable_balance", { precision: 10, scale: 2 }).default("0"),
  
  // API & Security
  apiSecretKey: text("api_secret_key"),
  mfaEnabled: boolean("mfa_enabled").default(false),
  mfaSecret: text("mfa_secret"), // Encrypted TOTP secret
  
  // Security tracking
  failedLoginAttempts: numeric("failed_login_attempts").default("0"),
  lockedUntil: timestamp("locked_until"),
  lastPasswordChange: timestamp("last_password_change"),
  
  // EFT Settings (default URLs for payment transactions)
  eftSettings: jsonb("eft_settings").$type<{
    notifyUrl?: string;
    successUrl?: string;
    failureUrl?: string;
    cancelledUrl?: string;
    fnbVerifyResult?: boolean;
    showTermsAndConditions?: boolean;
    enableReceipt?: boolean;
    // Payment page layout: "full" (default) or "banks_plain" — a minimal,
    // unbranded embed theme for iframes (steps + banks only)
    paymentLayout?: "full" | "banks_plain";
    plainShowCancel?: boolean;
    plainShowTerms?: boolean;
    plainBackground?: string;
  }>().default({}),

  // Metadata
  metadata: jsonb("metadata").default({}),
  notificationPreferences: jsonb("notification_preferences").default({}),
  
  // Audit
  avatarUrl: text("avatar_url"),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
  deletedAt: timestamp("deleted_at"),
});

// Better Auth required tables
export const sessions = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
});

export const accounts = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const verifications = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type Verification = typeof verifications.$inferSelect;
