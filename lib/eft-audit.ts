import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { storageConfig } from "@/lib/db/schema";
import { buildBackend, type StorageBackend } from "@/lib/storage-integrations/backends";
import { getProviderDef, isStorageProvider, type StorageProviderKey } from "@/lib/storage-integrations/registry";
import { decryptConfig } from "@/lib/storage-integrations/secret";

/**
 * EFT transaction audit storage helper.
 *
 * The EFT service writes a transaction log and screenshots to a shared storage
 * provider, organised as {bucket}/{YYYY-MM-DD}/{transactionId}/{file} (the EFT
 * session id IS the transaction id). This resolves those artifacts, returning
 * short-lived signed URLs for screenshots and the log text inline.
 *
 * The active provider + credentials are resolved from the `storage_config` table
 * (managed in admin → Storage). If no active row is configured, it falls back to
 * environment variables so existing deployments keep working:
 *   EFT_STORAGE_PROVIDER = s3 | supabase   (default supabase)
 *   S3_* / AWS_*                            (S3)
 *   EFT_STORAGE_SUPABASE_URL / _KEY, EFT_*_BUCKET (Supabase)
 */

const MAX_INLINE_LOG_BYTES = 200_000;
const IMAGE_RE = /\.(png|jpe?g|webp)$/i;

// Cache the resolved backend briefly — audit views are infrequent, but a viewer
// may open several transactions in a row; this avoids a DB hit + decrypt each time.
let cached: { at: number; backend: StorageBackend | null } | null = null;
const CACHE_MS = 30_000;

function envConfigFor(provider: StorageProviderKey): Record<string, string> {
  if (provider === "s3") {
    return {
      region: process.env.AWS_REGION || "us-east-1",
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
      screenshotsBucket: process.env.S3_SCREENSHOTS_BUCKET || "eft-screenshots",
      logsBucket: process.env.S3_LOGS_BUCKET || "eft-logs",
      endpoint: process.env.S3_ENDPOINT || "",
    };
  }
  if (provider === "supabase") {
    return {
      url: process.env.EFT_STORAGE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      serviceKey: process.env.EFT_STORAGE_SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "",
      screenshotsBucket: process.env.EFT_SCREENSHOTS_BUCKET || "screenshots",
      logsBucket: process.env.EFT_LOGS_BUCKET || "logs",
    };
  }
  return {};
}

/** True if the given env-derived config has enough to attempt a connection. */
function envConfigUsable(provider: StorageProviderKey, config: Record<string, string>): boolean {
  if (provider === "supabase") return !!(config.url && config.serviceKey);
  if (provider === "s3") return !!(config.logsBucket && config.screenshotsBucket); // creds may come from role chain
  return false;
}

async function resolveBackend(): Promise<StorageBackend | null> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.backend;

  let backend: StorageBackend | null = null;

  // 1) Active DB config wins.
  try {
    const [active] = await db.select().from(storageConfig).where(eq(storageConfig.isActive, true)).limit(1);
    if (active && isStorageProvider(active.provider)) {
      const def = getProviderDef(active.provider)!;
      const decrypted = decryptConfig(def, (active.config as Record<string, string>) || {});
      backend = buildBackend(active.provider, decrypted);
    }
  } catch {
    // storage_config table may not exist yet (pre-migration) — fall through to env.
  }

  // 2) Env fallback.
  if (!backend) {
    const envProvider = (process.env.EFT_STORAGE_PROVIDER || "supabase").toLowerCase();
    if (isStorageProvider(envProvider)) {
      const cfg = envConfigFor(envProvider);
      if (envConfigUsable(envProvider, cfg)) backend = buildBackend(envProvider, cfg);
    }
  }

  cached = { at: Date.now(), backend };
  return backend;
}

/** Clear the resolved-backend cache (call after activating/saving config). */
export function invalidateAuditBackendCache() {
  cached = null;
}

/** Whether a usable storage backend is currently resolvable (DB active row or env). */
export async function auditStorageConfigured(): Promise<boolean> {
  return (await resolveBackend()) !== null;
}

function dateFolder(d: Date): string {
  return d.toISOString().split("T")[0];
}

export interface AuditFile {
  name: string;
  url: string;
}

export interface TransactionAudit {
  transactionId: string;
  date: string | null;
  log: string | null;
  screenshots: AuditFile[];
  logFiles: AuditFile[];
}

/**
 * Resolve the audit artifacts for a transaction. Caller is responsible for
 * authorization (admin, or the owning partner/merchant).
 */
export async function getTransactionAudit(txn: {
  id: string;
  createdAt: Date;
  completedAt: Date | null;
  updatedAt: Date;
}): Promise<TransactionAudit> {
  const empty: TransactionAudit = {
    transactionId: txn.id,
    date: null,
    log: null,
    screenshots: [],
    logFiles: [],
  };

  const backend = await resolveBackend();
  if (!backend) return empty;

  // Artifacts live under the UTC date the session ran — try creation plus
  // adjacent dates (completion / next day) to cover sessions crossing midnight.
  const candidates = new Set<string>();
  candidates.add(dateFolder(txn.createdAt));
  if (txn.completedAt) candidates.add(dateFolder(txn.completedAt));
  if (txn.updatedAt) candidates.add(dateFolder(txn.updatedAt));
  const nextDay = new Date(txn.createdAt);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  candidates.add(dateFolder(nextDay));

  let usedDate: string | null = null;
  let log: string | null = null;
  const screenshots: AuditFile[] = [];
  const logFiles: AuditFile[] = [];

  // List each bucket independently and never let one failing bucket/permission
  // (e.g. ListBucket granted on logs but not screenshots) throw the whole audit —
  // degrade to what we can read and log the real error server-side.
  const listSafe = async (bucket: "screenshots" | "logs", prefix: string) => {
    try {
      return await backend.list(bucket, prefix);
    } catch (err) {
      console.error(`[audit] list failed for ${bucket}/${prefix}:`, err);
      return [] as { name: string; size?: number }[];
    }
  };

  for (const date of candidates) {
    const prefix = `${date}/${txn.id}`;

    const [shotList, logList] = await Promise.all([
      listSafe("screenshots", prefix),
      listSafe("logs", prefix),
    ]);

    const shotItems = shotList.filter((i) => IMAGE_RE.test(i.name));
    const logItems = logList;

    if (shotItems.length === 0 && logItems.length === 0) continue;
    usedDate = usedDate || date;

    for (const item of shotItems) {
      const url = await backend.signUrl("screenshots", `${prefix}/${item.name}`).catch(() => null);
      if (url) screenshots.push({ name: item.name, url });
    }

    for (const item of logItems) {
      const path = `${prefix}/${item.name}`;
      if (item.name === "transaction.log" && log === null) {
        if (item.size === undefined || item.size <= MAX_INLINE_LOG_BYTES) {
          log = await backend.downloadText("logs", path).catch(() => null);
        }
      }
      const url = await backend.signUrl("logs", path).catch(() => null);
      if (url) logFiles.push({ name: item.name, url });
    }
  }

  return { transactionId: txn.id, date: usedDate, log, screenshots, logFiles };
}
