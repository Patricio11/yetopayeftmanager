/**
 * Typed catalogue of the storage providers the platform can use for EFT audit
 * artifacts (logs + screenshots). The admin panel renders each provider's
 * credentialFields; secret fields are encrypted at rest and masked in the UI.
 *
 * Keep provider `key`s in sync with the EFT service's STORAGE_PROVIDER values
 * (src/storage/index.js) so both sides resolve the same config.
 */

export interface CredentialField {
  key: string;
  label: string;
  /** Encrypted at rest and never returned in clear to the browser (masked). */
  secret: boolean;
  placeholder?: string;
  /** Not required for a complete config. */
  optional?: boolean;
  /** Short helper text under the field. */
  hint?: string;
}

export type StorageProviderKey = "s3" | "supabase" | "postgres";

export interface StorageProviderDef {
  key: StorageProviderKey;
  label: string;
  description: string;
  /** Whether the write side (EFT service) can currently use this provider. */
  writeSupported: boolean;
  credentialFields: CredentialField[];
}

export const STORAGE_PROVIDERS: readonly StorageProviderDef[] = [
  {
    key: "s3",
    label: "Amazon S3",
    description:
      "Store logs & screenshots in S3 buckets. Recommended — cheap, scalable, and access is via short-lived signed URLs.",
    writeSupported: true,
    credentialFields: [
      { key: "region", label: "AWS region", secret: false, placeholder: "af-south-1" },
      {
        key: "accessKeyId",
        label: "Access key ID",
        secret: true,
        optional: true,
        hint: "Leave blank to use the instance/role default credential chain (EC2/ECS).",
      },
      { key: "secretAccessKey", label: "Secret access key", secret: true, optional: true },
      { key: "screenshotsBucket", label: "Screenshots bucket", secret: false, placeholder: "eft-screenshots" },
      { key: "logsBucket", label: "Logs bucket", secret: false, placeholder: "eft-logs" },
      {
        key: "endpoint",
        label: "Custom endpoint",
        secret: false,
        optional: true,
        placeholder: "https://…",
        hint: "Only for S3-compatible services (e.g. Cloudflare R2, MinIO). Leave blank for AWS.",
      },
    ],
  },
  {
    key: "supabase",
    label: "Supabase Storage",
    description: "Store in Supabase Storage buckets (Postgres-backed object storage).",
    writeSupported: true,
    credentialFields: [
      { key: "url", label: "Project URL", secret: false, placeholder: "https://xxxx.supabase.co" },
      { key: "serviceKey", label: "Service role key", secret: true },
      { key: "screenshotsBucket", label: "Screenshots bucket", secret: false, placeholder: "screenshots" },
      { key: "logsBucket", label: "Logs bucket", secret: false, placeholder: "logs" },
    ],
  },
  {
    key: "postgres",
    label: "PostgreSQL",
    description:
      "Store artifacts as rows in a Postgres database. Good for text logs; screenshots are stored as binary and can bloat the DB — S3 is preferred for images.",
    writeSupported: false, // EFT write side pending an artifact gateway endpoint
    credentialFields: [
      {
        key: "connectionString",
        label: "Connection string",
        secret: true,
        optional: true,
        placeholder: "postgres://…",
        hint: "Leave blank to reuse the platform database (DATABASE_URL).",
      },
    ],
  },
] as const;

export function getProviderDef(key: string): StorageProviderDef | undefined {
  return STORAGE_PROVIDERS.find((p) => p.key === key);
}

export function isStorageProvider(key: string): key is StorageProviderKey {
  return STORAGE_PROVIDERS.some((p) => p.key === key);
}
