import "server-only";
import { createClient } from "@supabase/supabase-js";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import type { StorageProviderKey } from "./registry";

/**
 * Storage backend abstraction shared by the audit reader and the admin "Test
 * connection" action. Given a provider + decrypted config, `buildBackend`
 * returns a uniform interface over S3 / Supabase / Postgres. All secrets must
 * already be decrypted by the caller (see secret.decryptConfig).
 */

const SIGNED_URL_TTL = 60 * 60; // 1 hour
const MAX_INLINE_LOG_BYTES = 200_000;

export type LogicalBucket = "screenshots" | "logs";

/** Best-effort content type from a filename, used when storage doesn't report one. */
export function contentTypeFor(name: string): string {
  const n = name.toLowerCase();
  if (n.endsWith(".png")) return "image/png";
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
  if (n.endsWith(".webp")) return "image/webp";
  if (n.endsWith(".json")) return "application/json";
  if (n.endsWith(".jsonl")) return "application/x-ndjson";
  if (n.endsWith(".html")) return "text/html; charset=utf-8";
  if (n.endsWith(".log") || n.endsWith(".txt")) return "text/plain; charset=utf-8";
  return "application/octet-stream";
}

export interface StorageBackend {
  /** List file names (not full paths) directly under `prefix`. */
  list(bucket: LogicalBucket, prefix: string): Promise<{ name: string; size?: number }[]>;
  /** A short-lived signed URL (or servable URL) for the object at `path`. */
  signUrl(bucket: LogicalBucket, path: string): Promise<string | null>;
  /** Download the object as text (only used for small logs). */
  downloadText(bucket: LogicalBucket, path: string): Promise<string | null>;
  /** Download the raw bytes for server-side proxying (private bucket, no CORS). Null if not found. */
  getObject(bucket: LogicalBucket, path: string): Promise<{ buffer: Buffer; contentType: string } | null>;
  /** Round-trip connectivity check for the admin panel. */
  test(): Promise<{ ok: boolean; message: string }>;
}

// ─── S3 ─────────────────────────────────────────────────────────────────────
function s3Backend(config: Record<string, string>): StorageBackend {
  const region = config.region || "us-east-1";
  const accessKeyId = config.accessKeyId;
  const secretAccessKey = config.secretAccessKey;
  const screenshotsBucket = config.screenshotsBucket || "eft-screenshots";
  const logsBucket = config.logsBucket || "eft-logs";
  const bucketOf = (b: LogicalBucket) => (b === "screenshots" ? screenshotsBucket : logsBucket);

  const client = new S3Client({
    region,
    // Don't let the SDK add x-amz-checksum-mode / content-sha256 integrity params
    // to presigned GET URLs — those extra query params break browser fetches (403)
    // and add nothing for a simple object download.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
    ...(config.endpoint ? { endpoint: config.endpoint, forcePathStyle: true } : {}),
    ...(accessKeyId && secretAccessKey ? { credentials: { accessKeyId, secretAccessKey } } : {}),
  });

  return {
    async list(bucket, prefix) {
      const Prefix = prefix.endsWith("/") ? prefix : `${prefix}/`;
      const res = await client.send(
        new ListObjectsV2Command({ Bucket: bucketOf(bucket), Prefix, MaxKeys: 200 })
      );
      return (res.Contents || [])
        .map((o) => ({ key: o.Key || "", size: o.Size }))
        .filter((o) => o.key && !o.key.endsWith("/"))
        .map((o) => ({ name: o.key.split("/").pop() as string, size: o.size }));
    },
    async signUrl(bucket, path) {
      return await getSignedUrl(
        client,
        new GetObjectCommand({ Bucket: bucketOf(bucket), Key: path }),
        { expiresIn: SIGNED_URL_TTL }
      );
    },
    async downloadText(bucket, path) {
      const res = await client.send(new GetObjectCommand({ Bucket: bucketOf(bucket), Key: path }));
      const body = res.Body as any;
      if (!body) return null;
      const chunks: Buffer[] = [];
      let total = 0;
      for await (const chunk of body) {
        const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        total += buf.length;
        if (total > MAX_INLINE_LOG_BYTES) return null;
        chunks.push(buf);
      }
      return Buffer.concat(chunks).toString("utf8");
    },
    async getObject(bucket, path) {
      try {
        const res = await client.send(new GetObjectCommand({ Bucket: bucketOf(bucket), Key: path }));
        const body = res.Body as any;
        if (!body) return null;
        const chunks: Buffer[] = [];
        for await (const chunk of body) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        return { buffer: Buffer.concat(chunks), contentType: res.ContentType || contentTypeFor(path) };
      } catch (e: any) {
        if (e?.name === "NoSuchKey" || e?.$metadata?.httpStatusCode === 404) return null;
        throw e;
      }
    },
    async test() {
      // Exercise exactly the perms that matter: write (the EFT service) + list
      // (the audit reader). Delete is only attempted as best-effort cleanup — many
      // deploy policies (intentionally) don't grant DeleteObject, so its failure
      // must NOT fail the test.
      const key = `__connection_test__/probe-${Date.now()}.txt`;
      const body = "yetopay storage connection test";
      try {
        await client.send(
          new PutObjectCommand({ Bucket: logsBucket, Key: key, Body: body, ContentType: "text/plain" })
        );
        await client.send(new ListObjectsV2Command({ Bucket: logsBucket, Prefix: "__connection_test__/", MaxKeys: 1 }));
        let cleaned = true;
        try {
          await client.send(new DeleteObjectCommand({ Bucket: logsBucket, Key: key }));
        } catch {
          cleaned = false;
        }
        return {
          ok: true,
          message: `Connected to S3 (${region}); write + list on "${logsBucket}" OK${
            cleaned ? "; probe cleaned up." : " (probe left — DeleteObject not granted, that's fine)."
          }`,
        };
      } catch (e: any) {
        return { ok: false, message: `S3 test failed: ${e?.name || ""} ${e?.message || String(e)}`.trim() };
      }
    },
  };
}

// ─── Supabase ─────────────────────────────────────────────────────────────────
function supabaseBackend(config: Record<string, string>): StorageBackend {
  const url = config.url || "";
  const key = config.serviceKey || "";
  const screenshotsBucket = config.screenshotsBucket || "screenshots";
  const logsBucket = config.logsBucket || "logs";
  const bucketOf = (b: LogicalBucket) => (b === "screenshots" ? screenshotsBucket : logsBucket);
  const client = createClient(url, key, { auth: { persistSession: false } });

  return {
    async list(bucket, prefix) {
      const { data } = await client.storage
        .from(bucketOf(bucket))
        .list(prefix, { limit: 200, sortBy: { column: "name", order: "asc" } });
      return (data || [])
        .filter((i) => i.name)
        .map((i) => ({ name: i.name, size: (i as any).metadata?.size as number | undefined }));
    },
    async signUrl(bucket, path) {
      const { data } = await client.storage.from(bucketOf(bucket)).createSignedUrl(path, SIGNED_URL_TTL);
      return data?.signedUrl || null;
    },
    async downloadText(bucket, path) {
      const { data: blob } = await client.storage.from(bucketOf(bucket)).download(path);
      if (blob && blob.size <= MAX_INLINE_LOG_BYTES) return await blob.text();
      return null;
    },
    async getObject(bucket, path) {
      const { data: blob, error } = await client.storage.from(bucketOf(bucket)).download(path);
      if (error || !blob) return null;
      const buffer = Buffer.from(await blob.arrayBuffer());
      return { buffer, contentType: blob.type || contentTypeFor(path) };
    },
    async test() {
      const key = `__connection_test__/probe-${Date.now()}.txt`;
      try {
        const up = await client.storage
          .from(logsBucket)
          .upload(key, new Blob(["yetopay storage connection test"]), { upsert: true });
        if (up.error) return { ok: false, message: `Supabase upload failed: ${up.error.message}` };
        // Best-effort cleanup — don't fail the test if remove isn't permitted.
        let cleaned = true;
        try {
          const rm = await client.storage.from(logsBucket).remove([key]);
          if (rm.error) cleaned = false;
        } catch {
          cleaned = false;
        }
        return {
          ok: true,
          message: `Connected to Supabase; write on "${logsBucket}" OK${
            cleaned ? "; probe cleaned up." : " (probe left — delete not permitted, that's fine)."
          }`,
        };
      } catch (e: any) {
        return { ok: false, message: `Supabase test failed: ${e?.message || String(e)}` };
      }
    },
  };
}

// ─── Postgres (connectivity only for now — read/write wiring pending) ─────────
function postgresBackend(config: Record<string, string>): StorageBackend {
  const custom = config.connectionString?.trim();
  return {
    async list() {
      return [];
    },
    async signUrl() {
      return null;
    },
    async downloadText() {
      return null;
    },
    async getObject() {
      return null;
    },
    async test() {
      if (custom) {
        return {
          ok: false,
          message:
            "Custom Postgres connection strings aren't wired yet — leave blank to use the platform database.",
        };
      }
      try {
        await db.execute(sql`select 1`);
        return {
          ok: true,
          message:
            "Platform database reachable. Note: Postgres artifact read/write wiring is not enabled yet (write side pending).",
        };
      } catch (e: any) {
        return { ok: false, message: `Postgres test failed: ${e?.message || String(e)}` };
      }
    },
  };
}

export function buildBackend(
  provider: StorageProviderKey,
  config: Record<string, string>
): StorageBackend {
  switch (provider) {
    case "s3":
      return s3Backend(config);
    case "supabase":
      return supabaseBackend(config);
    case "postgres":
      return postgresBackend(config);
  }
}
