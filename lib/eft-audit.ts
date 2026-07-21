import { createClient } from "@supabase/supabase-js";

/**
 * EFT transaction audit storage helper.
 *
 * The EFT service writes a transaction log and screenshots to PRIVATE Supabase
 * Storage buckets, organised as {bucket}/{YYYY-MM-DD}/{transactionId}/{file}
 * (the EFT session id IS the transaction id). This resolves those artifacts,
 * returning short-lived signed URLs for screenshots and the log text inline.
 *
 * Env (falls back to the app's Supabase project if the EFT-specific vars are
 * unset — set the EFT_STORAGE_* vars when the EFT service uses its own project):
 *   EFT_STORAGE_SUPABASE_URL   (or NEXT_PUBLIC_SUPABASE_URL)   ← canonical .supabase.co
 *   EFT_STORAGE_SUPABASE_KEY   (or SUPABASE_SERVICE_ROLE_KEY)  ← service_role
 *   EFT_SCREENSHOTS_BUCKET     (default: screenshots)
 *   EFT_LOGS_BUCKET            (default: logs)
 */

const STORAGE_URL =
  process.env.EFT_STORAGE_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "";
const STORAGE_KEY =
  process.env.EFT_STORAGE_SUPABASE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "";
const SCREENSHOTS_BUCKET = process.env.EFT_SCREENSHOTS_BUCKET || "screenshots";
const LOGS_BUCKET = process.env.EFT_LOGS_BUCKET || "logs";
const SIGNED_URL_TTL = 60 * 60; // 1 hour

const storage =
  STORAGE_URL && STORAGE_KEY
    ? createClient(STORAGE_URL, STORAGE_KEY, { auth: { persistSession: false } })
    : null;

export const auditStorageConfigured = !!storage;

const IMAGE_RE = /\.(png|jpe?g|webp)$/i;

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

  if (!storage) return empty;

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

  for (const date of candidates) {
    const prefix = `${date}/${txn.id}`;

    const [shotList, logList] = await Promise.all([
      storage.storage.from(SCREENSHOTS_BUCKET).list(prefix, { limit: 200, sortBy: { column: "name", order: "asc" } }),
      storage.storage.from(LOGS_BUCKET).list(prefix, { limit: 50, sortBy: { column: "name", order: "asc" } }),
    ]);

    const shotItems = (shotList.data || []).filter((i) => i.name && IMAGE_RE.test(i.name));
    const logItems = (logList.data || []).filter((i) => i.name);

    if (shotItems.length === 0 && logItems.length === 0) continue;
    usedDate = usedDate || date;

    if (shotItems.length > 0) {
      const paths = shotItems.map((i) => `${prefix}/${i.name}`);
      const { data: signed } = await storage.storage
        .from(SCREENSHOTS_BUCKET)
        .createSignedUrls(paths, SIGNED_URL_TTL);
      (signed || []).forEach((s, idx) => {
        if (s.signedUrl) screenshots.push({ name: shotItems[idx].name, url: s.signedUrl });
      });
    }

    for (const item of logItems) {
      const path = `${prefix}/${item.name}`;
      if (item.name === "transaction.log" && log === null) {
        const { data: blob } = await storage.storage.from(LOGS_BUCKET).download(path);
        if (blob) log = await blob.text();
      }
      const { data: signed } = await storage.storage
        .from(LOGS_BUCKET)
        .createSignedUrl(path, SIGNED_URL_TTL);
      if (signed?.signedUrl) logFiles.push({ name: item.name, url: signed.signedUrl });
    }
  }

  return { transactionId: txn.id, date: usedDate, log, screenshots, logFiles };
}
