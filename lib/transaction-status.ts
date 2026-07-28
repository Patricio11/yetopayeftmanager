/**
 * Transaction status buckets — the raw enum has 8 values
 * (not_started, initiated, pending, completed, failed, aborted, cancelled, expired)
 * which we group into 5 human buckets for filtering, the breakdown chips, and export.
 * Shared by the server (query + aggregation) and the client (chips) so labels and
 * groupings never drift.
 */

export type StatusBucketKey = "not_started" | "pending" | "completed" | "failed" | "cancelled";

export type StatusTone = "slate" | "amber" | "green" | "red" | "orange";

export interface StatusBucket {
  key: StatusBucketKey;
  label: string;
  /** Raw enum statuses that roll up into this bucket. */
  statuses: string[];
  tone: StatusTone;
}

export const STATUS_BUCKETS: StatusBucket[] = [
  { key: "not_started", label: "Not started", statuses: ["not_started"], tone: "slate" },
  { key: "pending", label: "Pending", statuses: ["initiated", "pending"], tone: "amber" },
  { key: "completed", label: "Successful", statuses: ["completed"], tone: "green" },
  { key: "failed", label: "Failed", statuses: ["failed", "aborted", "expired"], tone: "red" },
  { key: "cancelled", label: "Cancelled", statuses: ["cancelled"], tone: "orange" },
];

export const STATUS_BUCKET_KEYS = STATUS_BUCKETS.map((b) => b.key);

/** Raw statuses for a bucket key, or null if the key isn't a known bucket. */
export function statusesForBucket(key: string | undefined | null): string[] | null {
  if (!key || key === "all") return null;
  const bucket = STATUS_BUCKETS.find((b) => b.key === key);
  if (bucket) return bucket.statuses;
  // Back-compat: a raw enum value passed directly (e.g. old links using ?status=completed
  // already map, but ?status=initiated should still work as "pending").
  const owning = STATUS_BUCKETS.find((b) => b.statuses.includes(key));
  return owning ? owning.statuses : [key];
}

/** The bucket a raw status belongs to (for badges/labels). */
export function bucketForStatus(status: string | null | undefined): StatusBucket | undefined {
  if (!status) return undefined;
  return STATUS_BUCKETS.find((b) => b.statuses.includes(status));
}
