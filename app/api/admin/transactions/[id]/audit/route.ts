import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { eftTransactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";

/**
 * GET /api/admin/transactions/[id]/audit
 *
 * Audit trail for a transaction: the EFT service's transaction log plus the
 * screenshots it captured, stored in Supabase Storage as
 *   {bucket}/{YYYY-MM-DD}/{transactionId}/{file}
 * (the EFT session id IS the transaction id).
 *
 * The buckets are PRIVATE, so screenshots are returned as short-lived signed
 * URLs and the log is downloaded server-side with the service key. Admin only —
 * these screenshots contain customers' bank screens.
 *
 * Env (falls back to the app's Supabase project if the EFT-specific vars are
 * unset — set the EFT_STORAGE_* vars when the EFT service uses its own project):
 *   EFT_STORAGE_SUPABASE_URL       (or NEXT_PUBLIC_SUPABASE_URL)
 *   EFT_STORAGE_SUPABASE_KEY       (or SUPABASE_SERVICE_ROLE_KEY)  ← service_role
 *   EFT_SCREENSHOTS_BUCKET         (default: screenshots)
 *   EFT_LOGS_BUCKET                (default: logs)
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

const IMAGE_RE = /\.(png|jpe?g|webp)$/i;

/** UTC date folder (YYYY-MM-DD) for a timestamp. */
function dateFolder(d: Date): string {
  return d.toISOString().split("T")[0];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  try {
    const transaction = await db.query.eftTransactions.findFirst({
      where: eq(eftTransactions.id, id),
      columns: { id: true, createdAt: true, completedAt: true, updatedAt: true },
    });

    if (!transaction) {
      return NextResponse.json(
        { success: false, message: "Transaction not found" },
        { status: 404 }
      );
    }

    if (!storage) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Audit storage is not configured. Set EFT_STORAGE_SUPABASE_URL and EFT_STORAGE_SUPABASE_KEY (service_role).",
        },
        { status: 500 }
      );
    }

    // Artifacts live under the UTC date the session ran — try creation plus
    // adjacent dates (completion / next day) to cover sessions crossing midnight.
    const candidates = new Set<string>();
    candidates.add(dateFolder(transaction.createdAt));
    if (transaction.completedAt) candidates.add(dateFolder(transaction.completedAt));
    if (transaction.updatedAt) candidates.add(dateFolder(transaction.updatedAt));
    const nextDay = new Date(transaction.createdAt);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    candidates.add(dateFolder(nextDay));

    let usedDate: string | null = null;
    let log: string | null = null;
    const screenshots: { name: string; url: string }[] = [];
    const logFiles: { name: string; url: string }[] = [];

    for (const date of candidates) {
      const prefix = `${date}/${id}`;

      const [shotList, logList] = await Promise.all([
        storage.storage.from(SCREENSHOTS_BUCKET).list(prefix, { limit: 200, sortBy: { column: "name", order: "asc" } }),
        storage.storage.from(LOGS_BUCKET).list(prefix, { limit: 50, sortBy: { column: "name", order: "asc" } }),
      ]);

      const shotItems = (shotList.data || []).filter((i) => i.name && IMAGE_RE.test(i.name));
      const logItems = (logList.data || []).filter((i) => i.name);

      if (shotItems.length === 0 && logItems.length === 0) continue;
      usedDate = usedDate || date;

      // Sign screenshot URLs in one batch
      if (shotItems.length > 0) {
        const paths = shotItems.map((i) => `${prefix}/${i.name}`);
        const { data: signed } = await storage.storage
          .from(SCREENSHOTS_BUCKET)
          .createSignedUrls(paths, SIGNED_URL_TTL);
        (signed || []).forEach((s, idx) => {
          if (s.signedUrl) screenshots.push({ name: shotItems[idx].name, url: s.signedUrl });
        });
      }

      // Download the text log inline; sign any other log files (e.g. intercept)
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

    return NextResponse.json({
      success: true,
      data: {
        transactionId: id,
        date: usedDate,
        log,
        screenshots,
        logFiles,
      },
    });
  } catch (error) {
    console.error("Error fetching transaction audit:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch audit trail" },
      { status: 500 }
    );
  }
}
