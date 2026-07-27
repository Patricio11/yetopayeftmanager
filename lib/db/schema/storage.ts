import { pgTable, uuid, varchar, text, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";

/**
 * Storage integration config — where the EFT service writes transaction logs &
 * screenshots and where the audit view reads them from. One row per provider
 * ('s3' | 'supabase' | 'postgres'); exactly one row has isActive = true, and
 * that is the provider both the dashboard audit reader and the EFT service use.
 *
 * Secret fields inside `config` (access keys, service keys, connection strings)
 * are encrypted at rest with lib/security/credential-encryption (encryptString),
 * so the raw jsonb never holds plaintext credentials.
 */
export const storageConfig = pgTable("storage_config", {
  id: uuid("id").defaultRandom().primaryKey(),

  // Provider key from the storage-integrations registry.
  provider: varchar("provider", { length: 32 }).notNull().unique(),

  // Provider settings. Non-secret fields (region, buckets) are plaintext; secret
  // fields are individually encrypted strings (enc blob). Shape is per-provider.
  config: jsonb("config").$type<Record<string, string>>().default({}),

  // Exactly one provider is active at a time — the one reads/writes resolve to.
  isActive: boolean("is_active").default(false).notNull(),

  // Last "Test connection" result, surfaced in the admin panel.
  lastTestedAt: timestamp("last_tested_at"),
  lastTestOk: boolean("last_test_ok"),
  lastTestMessage: text("last_test_message"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: uuid("updated_by"),
});

export type StorageConfig = typeof storageConfig.$inferSelect;
export type NewStorageConfig = typeof storageConfig.$inferInsert;
