import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema/system";
import { NextRequest } from "next/server";

interface AuditLogEntry {
  userId: string;
  action: "create" | "update" | "delete";
  resource: string;
  resourceId?: string;
  changes?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  };
  request?: NextRequest;
}

/**
 * Write an audit log entry for admin actions.
 * Fire-and-forget: errors are logged but never thrown.
 */
export async function writeAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      userId: entry.userId,
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resourceId,
      changes: entry.changes,
      ipAddress: entry.request?.headers.get("x-forwarded-for")
        ?? entry.request?.headers.get("x-real-ip")
        ?? undefined,
      userAgent: entry.request?.headers.get("user-agent") ?? undefined,
      method: entry.request?.method,
      endpoint: entry.request ? new URL(entry.request.url).pathname : undefined,
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}
