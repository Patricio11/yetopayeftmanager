import { pgTable, uuid, text, numeric, timestamp, boolean, jsonb, integer, index, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./users";

// ─── Partner Fee / Commission Configuration ─────────────────────────────────
// Admin assigns each partner a commission mode and fee structure.
export const eftPartnerFees = pgTable("eft_partner_fees", {
  id: uuid("id").defaultRandom().primaryKey(),
  partnerId: text("partner_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),

  // Commission mode: "handle_outside" (no tracking) or "commission" (tracked in system)
  commissionMode: text("commission_mode", {
    enum: ["handle_outside", "commission"],
  }).notNull().default("handle_outside"),

  // Fee type (only relevant when commissionMode = "commission")
  feeType: text("fee_type", { enum: ["fixed", "percentage", "volume"] }).default("fixed"),

  // Custom fee values (null = use system default from eftSystemFees)
  fixedFeeValue: numeric("fixed_fee_value", { precision: 10, scale: 4 }),
  percentageFeeValue: numeric("percentage_fee_value", { precision: 10, scale: 4 }),
  volumeFeeValue: numeric("volume_fee_value", { precision: 10, scale: 4 }),

  // VAT override (null = use system default)
  vatEnabled: boolean("vat_enabled"),
  vatRate: numeric("vat_rate", { precision: 5, scale: 2 }),

  // Status
  isActive: boolean("is_active").default(true),

  // Timestamps & Audit
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: text("created_by"),
  updatedBy: text("updated_by"),
}, (table) => ({
  partnerIdx: index("eft_partner_fees_partner_idx").on(table.partnerId),
}));

// ─── Partner Commission Invoices ─────────────────────────────────────────────
// Generated invoices for partner commissions across all their merchants.
export const eftPartnerInvoices = pgTable("eft_partner_invoices", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  partnerId: text("partner_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  // Billing period
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),

  // Financials (ZAR, 2 decimal places)
  subtotalAmount: numeric("subtotal_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  vatAmount: numeric("vat_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),

  // Summary (aggregated across all partner's merchants)
  transactionCount: integer("transaction_count").default(0),
  transactionVolume: numeric("transaction_volume", { precision: 14, scale: 2 }).default("0"),
  merchantCount: integer("merchant_count").default(0),

  // Fee snapshot (captured at generation time)
  feeType: text("fee_type", { enum: ["fixed", "percentage", "volume"] }).notNull(),
  feeValue: numeric("fee_value", { precision: 10, scale: 4 }).notNull(),
  vatRate: numeric("vat_rate", { precision: 5, scale: 2 }).default("15.00"),
  vatEnabled: boolean("vat_enabled").default(true),

  // Status
  status: text("status", {
    enum: ["draft", "sent", "paid", "overdue", "cancelled"],
  }).default("draft").notNull(),

  // Dates
  dueDate: timestamp("due_date"),
  paidAt: timestamp("paid_at"),
  sentAt: timestamp("sent_at"),

  // Notes
  notes: text("notes"),

  // Per-merchant breakdown stored as JSONB
  merchantBreakdown: jsonb("merchant_breakdown").$type<Array<{
    merchantId: string;
    merchantName: string;
    transactionCount: number;
    transactionVolume: string;
    commissionAmount: string;
  }>>().default([]),

  // Audit
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  partnerIdx: index("eft_partner_invoices_partner_idx").on(table.partnerId),
  statusIdx: index("eft_partner_invoices_status_idx").on(table.status),
  periodIdx: index("eft_partner_invoices_period_idx").on(table.periodStart, table.periodEnd),
  partnerPeriodUniq: uniqueIndex("eft_partner_invoices_partner_period_uniq").on(table.partnerId, table.periodStart, table.periodEnd),
}));

// ─── Partner Invoice Line Items ──────────────────────────────────────────────
export const eftPartnerInvoiceItems = pgTable("eft_partner_invoice_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceId: uuid("invoice_id").notNull().references(() => eftPartnerInvoices.id, { onDelete: "cascade" }),

  description: text("description").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitAmount: numeric("unit_amount", { precision: 12, scale: 4 }).notNull(),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),

  // Optional: which merchant this line item relates to
  merchantId: text("merchant_id").references(() => users.id),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  invoiceIdx: index("eft_partner_invoice_items_invoice_idx").on(table.invoiceId),
}));

// ─── Type Exports ────────────────────────────────────────────────────────────
export type EftPartnerFee = typeof eftPartnerFees.$inferSelect;
export type NewEftPartnerFee = typeof eftPartnerFees.$inferInsert;
export type EftPartnerInvoice = typeof eftPartnerInvoices.$inferSelect;
export type NewEftPartnerInvoice = typeof eftPartnerInvoices.$inferInsert;
export type EftPartnerInvoiceItem = typeof eftPartnerInvoiceItems.$inferSelect;
