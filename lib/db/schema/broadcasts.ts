import { pgTable, uuid, text, timestamp, integer, index } from "drizzle-orm/pg-core";
import { users } from "./users";

export const emailBroadcasts = pgTable("email_broadcasts", {
  id: uuid("id").defaultRandom().primaryKey(),
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  recipientType: text("recipient_type", {
    enum: ["all", "merchants", "partners", "custom"],
  }).notNull(),
  status: text("status", {
    enum: ["draft", "sending", "sent", "failed"],
  }).default("draft").notNull(),
  totalRecipients: integer("total_recipients").default(0),
  sentCount: integer("sent_count").default(0),
  failedCount: integer("failed_count").default(0),
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  sentAt: timestamp("sent_at"),
  lastResentAt: timestamp("last_resent_at"),
}, (table) => ({
  createdAtIdx: index("email_broadcasts_created_at_idx").on(table.createdAt),
  statusIdx: index("email_broadcasts_status_idx").on(table.status),
}));

export const emailBroadcastRecipients = pgTable("email_broadcast_recipients", {
  id: uuid("id").defaultRandom().primaryKey(),
  broadcastId: uuid("broadcast_id").notNull().references(() => emailBroadcasts.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id),
  email: text("email").notNull(),
  name: text("name").notNull(),
  status: text("status", {
    enum: ["pending", "sent", "failed"],
  }).default("pending").notNull(),
  sentAt: timestamp("sent_at"),
  error: text("error"),
}, (table) => ({
  broadcastIdx: index("email_broadcast_recipients_broadcast_idx").on(table.broadcastId),
}));

export type EmailBroadcast = typeof emailBroadcasts.$inferSelect;
export type EmailBroadcastRecipient = typeof emailBroadcastRecipients.$inferSelect;
