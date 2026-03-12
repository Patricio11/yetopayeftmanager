import { pgTable, uuid, text, timestamp, jsonb, boolean, index, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./users";

// System Logs
export const systemLogs = pgTable("system_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  
  // Log details
  action: text("action").notNull(),
  category: text("category").notNull(),
  severity: text("severity", { enum: ["info", "warning", "error", "critical"] }).notNull(),
  
  // Details
  details: jsonb("details"),
  
  // Request info
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("system_log_user_idx").on(table.userId),
  categoryIdx: index("system_log_category_idx").on(table.category),
  severityIdx: index("system_log_severity_idx").on(table.severity),
  createdAtIdx: index("system_log_created_idx").on(table.createdAt),
}));

// Audit Logs (Enhanced for compliance)
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  
  // Action details
  action: text("action").notNull(), // 'create', 'update', 'delete', 'view'
  resource: text("resource").notNull(), // 'payment_link', 'transaction', 'user', etc.
  resourceId: text("resource_id"),
  
  // Changes (before/after)
  changes: jsonb("changes").$type<{
    before?: Record<string, any>;
    after?: Record<string, any>;
  }>(),
  
  // Request context
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  method: text("method"), // GET, POST, PUT, DELETE
  endpoint: text("endpoint"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("audit_log_user_idx").on(table.userId),
  resourceIdx: index("audit_log_resource_idx").on(table.resource),
  actionIdx: index("audit_log_action_idx").on(table.action),
  createdAtIdx: index("audit_log_created_idx").on(table.createdAt),
}));

// Notifications
export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Notification details
  type: text("type").notNull(), // 'payment_updates', 'withdrawal_updates', 'kyc_status_changes', etc.
  title: text("title").notNull(),
  message: text("message").notNull(),
  
  // Status
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  
  // Metadata
  metadata: jsonb("metadata").default({}),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("notification_user_idx").on(table.userId),
  isReadIdx: index("notification_read_idx").on(table.isRead),
}));

// User Services (Service enablement per merchant)
export const userServices = pgTable("user_services", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Service details
  serviceName: text("service_name").notNull(), // 'ONEGATEEFT', 'PAYMENT_LINKS', 'CALLPAYEFT', etc.
  isEnabled: boolean("is_enabled").default(false),
  
  // Configuration
  configuration: jsonb("configuration").default({}),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("user_service_user_idx").on(table.userId),
  serviceIdx: index("user_service_name_idx").on(table.serviceName),
  userServiceUniq: uniqueIndex("user_service_user_service_uniq").on(table.userId, table.serviceName),
}));

// Type exports
export type SystemLog = typeof systemLogs.$inferSelect;
export type NewSystemLog = typeof systemLogs.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type UserService = typeof userServices.$inferSelect;
export type NewUserService = typeof userServices.$inferInsert;
