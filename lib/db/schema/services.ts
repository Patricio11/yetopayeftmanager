import { pgTable, uuid, text, timestamp, boolean, jsonb, integer, index, uniqueIndex } from "drizzle-orm/pg-core";

// Payment Services — platform registry of available payment methods
export const paymentServices = pgTable("payment_services", {
  id: uuid("id").defaultRandom().primaryKey(),

  code: text("code").notNull().unique(), // 'eft_direct', 'card_callpay', etc.
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(), // 'eft', 'card', 'voucher', 'qr', 'crypto', 'wallet'
  provider: text("provider").notNull(), // 'internal' or 'callpay'

  providerConfig: jsonb("provider_config").$type<Record<string, any>>().default({}),

  icon: text("icon"), // lucide icon name for UI
  isActive: boolean("is_active").default(false),
  requiresSetup: boolean("requires_setup").default(false),
  displayOrder: integer("display_order").default(0),

  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  codeIdx: index("payment_services_code_idx").on(table.code),
  categoryIdx: index("payment_services_category_idx").on(table.category),
  activeIdx: index("payment_services_active_idx").on(table.isActive),
}));

// Type exports
export type PaymentService = typeof paymentServices.$inferSelect;
export type NewPaymentService = typeof paymentServices.$inferInsert;
