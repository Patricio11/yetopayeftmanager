import { pgTable, uuid, text, numeric, timestamp, boolean, jsonb, integer, index, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./users";
import { eftTransactions } from "./eft";

// ─── Merchant Fee Configuration ─────────────────────────────────────────────
// Admin assigns each merchant a fee type (fixed or percentage).
// Optionally override fee values; otherwise system defaults apply.
export const eftMerchantFees = pgTable("eft_merchant_fees", {
  id: uuid("id").defaultRandom().primaryKey(),
  merchantId: text("merchant_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),

  // Which fee type this merchant uses: "fixed", "percentage", or "volume"
  feeType: text("fee_type", { enum: ["fixed", "percentage", "volume"] }).notNull().default("fixed"),

  // Optional custom fee values (null = use system default)
  fixedFeeValue: numeric("fixed_fee_value", { precision: 10, scale: 4 }),
  percentageFeeValue: numeric("percentage_fee_value", { precision: 10, scale: 4 }),
  volumeFeeValue: numeric("volume_fee_value", { precision: 10, scale: 4 }), // Percentage of total transaction volume

  // VAT override (null = use system default)
  vatEnabled: boolean("vat_enabled"),
  vatRate: numeric("vat_rate", { precision: 5, scale: 2 }),

  // Status
  isActive: boolean("is_active").default(true),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  merchantIdx: index("eft_merchant_fees_merchant_idx").on(table.merchantId),
}));

// ─── Invoices ───────────────────────────────────────────────────────────────
// Generated invoices for merchants based on their transaction volume and fee config.
export const eftInvoices = pgTable("eft_invoices", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  merchantId: text("merchant_id").notNull().references(() => users.id, { onDelete: "cascade" }),

  // Billing period
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),

  // Financials (stored in ZAR, 2 decimal places)
  subtotalAmount: numeric("subtotal_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  vatAmount: numeric("vat_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),

  // Summary
  transactionCount: integer("transaction_count").default(0),
  transactionVolume: numeric("transaction_volume", { precision: 14, scale: 2 }).default("0"),

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

  // Metadata
  metadata: jsonb("metadata").default({}),

  // Audit
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  merchantIdx: index("eft_invoices_merchant_idx").on(table.merchantId),
  statusIdx: index("eft_invoices_status_idx").on(table.status),
  periodIdx: index("eft_invoices_period_idx").on(table.periodStart, table.periodEnd),
  invoiceNumberIdx: index("eft_invoices_number_idx").on(table.invoiceNumber),
  merchantPeriodUniq: uniqueIndex("eft_invoices_merchant_period_uniq").on(table.merchantId, table.periodStart, table.periodEnd),
}));

// ─── Invoice Line Items ─────────────────────────────────────────────────────
export const eftInvoiceItems = pgTable("eft_invoice_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceId: uuid("invoice_id").notNull().references(() => eftInvoices.id, { onDelete: "cascade" }),

  description: text("description").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitAmount: numeric("unit_amount", { precision: 12, scale: 4 }).notNull(),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),

  // Optional reference to specific transaction
  transactionId: uuid("transaction_id").references(() => eftTransactions.id),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  invoiceIdx: index("eft_invoice_items_invoice_idx").on(table.invoiceId),
}));

// ─── System-level Default Fee Settings ──────────────────────────────────────
// One row, stores global defaults. Admin sets BOTH fixed and percentage rates.
export const eftSystemFees = pgTable("eft_system_fees", {
  id: uuid("id").defaultRandom().primaryKey(),

  // Both fee values are always set at system level
  fixedFeeValue: numeric("fixed_fee_value", { precision: 10, scale: 4 }).notNull().default("5.00"),
  percentageFeeValue: numeric("percentage_fee_value", { precision: 10, scale: 4 }).notNull().default("2.50"),
  volumeFeeValue: numeric("volume_fee_value", { precision: 10, scale: 4 }).notNull().default("2.00"), // Default volume fee percentage (e.g. 2% of total volume)

  // VAT defaults
  vatEnabled: boolean("vat_enabled").default(true),
  vatRate: numeric("vat_rate", { precision: 5, scale: 2 }).default("15.00"),

  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: text("updated_by").references(() => users.id),
});

// ─── Type Exports ───────────────────────────────────────────────────────────
export type EftMerchantFee = typeof eftMerchantFees.$inferSelect;
export type NewEftMerchantFee = typeof eftMerchantFees.$inferInsert;
export type EftInvoice = typeof eftInvoices.$inferSelect;
export type NewEftInvoice = typeof eftInvoices.$inferInsert;
export type EftInvoiceItem = typeof eftInvoiceItems.$inferSelect;
export type NewEftInvoiceItem = typeof eftInvoiceItems.$inferInsert;
export type EftSystemFee = typeof eftSystemFees.$inferSelect;
