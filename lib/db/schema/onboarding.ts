import { pgTable, text, boolean, timestamp, integer, index } from "drizzle-orm/pg-core";
import { users } from "./users";

export const onboardingRequirements = pgTable("onboarding_requirements", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  appliesTo: text("applies_to", { enum: ["merchant", "partner", "both"] }).default("both").notNull(),

  templateUrl: text("template_url"),
  templateOriginalName: text("template_original_name"),
  templateMimeType: text("template_mime_type"),
  templateSizeBytes: integer("template_size_bytes"),

  required: boolean("required").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  active: boolean("active").default(true).notNull(),

  uploadedBy: text("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("onboarding_req_sort_idx").on(t.sortOrder),
  index("onboarding_req_active_idx").on(t.active),
  index("onboarding_req_applies_idx").on(t.appliesTo),
]);

export const companyDocuments = pgTable("company_documents", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  requirementId: text("requirement_id").references(() => onboardingRequirements.id),
  originalName: text("original_name").notNull(),
  storedName: text("stored_name"),
  url: text("url").notNull(),
  mimeType: text("mime_type"),
  sizeBytes: integer("size_bytes"),
  notes: text("notes"),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
}, (t) => [
  index("company_docs_user_idx").on(t.userId),
  index("company_docs_req_idx").on(t.requirementId),
]);

export type OnboardingRequirement = typeof onboardingRequirements.$inferSelect;
export type NewOnboardingRequirement = typeof onboardingRequirements.$inferInsert;
export type CompanyDocument = typeof companyDocuments.$inferSelect;
export type NewCompanyDocument = typeof companyDocuments.$inferInsert;
