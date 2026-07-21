"use client";

import { useMemo, useState } from "react";
import {
  Camera, AlertTriangle, XCircle, CheckCircle, CreditCard, Play,
  Code, ScrollText, ExternalLink, X,
} from "lucide-react";

export interface AuditShot {
  name: string;
  url: string;
}

interface AuditTimelineProps {
  log: string | null;
  screenshots: AuditShot[];
}

interface TimelineEvent {
  time: string;
  elapsed: string;
  level: string;
  event: string;
  message: string;
  imageUrl?: string;
}

// Stored screenshots are prefixed with a "YYYYMMDD-HHmmss_" timestamp
// (e.g. "20260721-112023_fnb.png"); strip it to match the log's plain filename.
const stripPrefix = (n: string) => n.replace(/^\d{6,}-\d{4,}_/, "");

/** Merge the EFT log and screenshots into one chronological storyline. */
function buildTimeline(log: string | null, screenshots: AuditShot[]): TimelineEvent[] {
  const byBase = new Map(screenshots.map((s) => [stripPrefix(s.name), s.url] as const));
  const used = new Set<string>();
  const events: TimelineEvent[] = [];

  if (log) {
    // [ISO] [LEVEL] [EVENT] [+elapsed] message | {json}
    const re = /^\[([^\]]+)\]\s*\[([^\]]+)\]\s*\[([^\]]+)\]\s*\[([^\]]+)\]\s*([\s\S]*)$/;
    for (const raw of log.split("\n")) {
      if (!raw.trim()) continue;
      const m = raw.match(re);
      if (!m) continue;
      const [, time, level, event, elapsed, rest] = m;
      const message = rest.split(" | ")[0].trim();

      // The image is carried on the SCREENSHOT event line — skip the duplicate
      // "Screenshot saved" INFO line so each shot appears once.
      if (event === "INFO" && /^Screenshot saved/.test(message)) continue;

      let imageUrl: string | undefined;
      if (event === "SCREENSHOT") {
        const fm =
          message.match(/Screenshot saved:\s*(\S+)/) ||
          rest.match(/"filename":"([^"]+)"/);
        if (fm) {
          const url = byBase.get(fm[1]);
          if (url) {
            imageUrl = url;
            used.add(fm[1]);
          }
        }
      }
      events.push({ time, elapsed, level, event, message, imageUrl });
    }
  }

  // Any screenshot that never matched a log line still gets shown, in order.
  for (const s of screenshots) {
    if (!used.has(stripPrefix(s.name))) {
      events.push({
        time: "",
        elapsed: "",
        level: "INFO",
        event: "SCREENSHOT",
        message: stripPrefix(s.name),
        imageUrl: s.url,
      });
    }
  }

  return events;
}

/** Visual style per event category. */
function styleFor(e: TimelineEvent): {
  dot: string;
  icon?: React.ReactNode;
  msgClass: string;
  badge?: { label: string; className: string };
} {
  const lvl = e.level.toUpperCase();
  if (e.event === "SCREENSHOT") {
    return { dot: "bg-sky-400", icon: <Camera className="w-3 h-3 text-white" />, msgClass: "text-slate-500 text-xs" };
  }
  if (lvl === "ERROR") {
    return {
      dot: "bg-red-500", icon: <XCircle className="w-3 h-3 text-white" />,
      msgClass: "text-red-700 font-medium",
      badge: { label: "Error", className: "bg-red-100 text-red-700" },
    };
  }
  if (lvl === "WARN") {
    return {
      dot: "bg-amber-500", icon: <AlertTriangle className="w-3 h-3 text-white" />,
      msgClass: "text-amber-700",
      badge: { label: "Warning", className: "bg-amber-100 text-amber-700" },
    };
  }
  if (e.event === "TRANSACTION_START" || e.event === "STEP") {
    return {
      dot: "bg-emerald-500", icon: <Play className="w-3 h-3 text-white" />,
      msgClass: "text-slate-900 font-semibold",
      badge: { label: e.event === "TRANSACTION_START" ? "Start" : "Step", className: "bg-emerald-100 text-emerald-700" },
    };
  }
  if (e.event === "SUCCESS") {
    return {
      dot: "bg-emerald-600", icon: <CheckCircle className="w-3 h-3 text-white" />,
      msgClass: "text-emerald-800 font-semibold",
      badge: { label: "Success", className: "bg-emerald-100 text-emerald-700" },
    };
  }
  if (e.event === "PAYMENT_DETAILS") {
    return {
      dot: "bg-indigo-500", icon: <CreditCard className="w-3 h-3 text-white" />,
      msgClass: "text-indigo-800 font-medium",
      badge: { label: "Payment", className: "bg-indigo-100 text-indigo-700" },
    };
  }
  return { dot: "bg-slate-300", msgClass: "text-slate-600 text-sm" };
}

function lineClass(line: string): string {
  if (line.includes("[ERROR]")) return "text-red-400";
  if (line.includes("[WARN]")) return "text-amber-400";
  if (line.includes("[SCREENSHOT]")) return "text-sky-400";
  if (line.includes("[STEP]") || line.includes("[TRANSACTION_START]") || line.includes("[SUCCESS]")) return "text-emerald-400";
  return "text-slate-300";
}

export function AuditTimeline({ log, screenshots }: AuditTimelineProps) {
  const [view, setView] = useState<"story" | "raw">("story");
  const [lightbox, setLightbox] = useState<string | null>(null);

  const events = useMemo(() => buildTimeline(log, screenshots), [log, screenshots]);
  const isEmpty = events.length === 0 && !log;

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ScrollText className="w-12 h-12 text-slate-300 mb-3" />
        <p className="text-slate-500 font-medium">No audit trail found</p>
        <p className="text-sm text-slate-400 mt-1">
          Nothing was captured, or storage is not reachable for this transaction.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* View toggle */}
      <div className="flex items-center gap-2 px-1 pb-3">
        <button
          onClick={() => setView("story")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            view === "story" ? "bg-green-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <ScrollText className="w-3.5 h-3.5 inline mr-1.5" />
          Storyline
        </button>
        <button
          onClick={() => setView("raw")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            view === "raw" ? "bg-green-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <Code className="w-3.5 h-3.5 inline mr-1.5" />
          Raw log
        </button>
        {screenshots.length > 0 && (
          <span className="ml-auto text-xs text-slate-400">{screenshots.length} screenshots</span>
        )}
      </div>

      {view === "raw" ? (
        <div className="rounded-lg bg-slate-950 p-4 overflow-x-auto">
          <pre className="text-[11px] leading-relaxed font-mono whitespace-pre-wrap break-all">
            {(log || "").split("\n").map((line, i) => (
              <div key={i} className={lineClass(line)}>{line}</div>
            ))}
          </pre>
        </div>
      ) : (
        <div className="space-y-0">
          {events.map((e, i) => {
            const s = styleFor(e);
            const last = i === events.length - 1;
            return (
              <div key={i} className="flex gap-3">
                {/* Rail */}
                <div className="flex flex-col items-center pt-1.5">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${s.dot}`}>
                    {s.icon}
                  </span>
                  {!last && <span className="flex-1 w-px bg-slate-200 my-1" />}
                </div>

                {/* Content */}
                <div className={`flex-1 min-w-0 ${last ? "pb-1" : "pb-4"}`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    {e.elapsed && <span className="text-[11px] font-mono text-slate-400">{e.elapsed}</span>}
                    {s.badge && (
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${s.badge.className}`}>
                        {s.badge.label}
                      </span>
                    )}
                  </div>
                  <p className={`${s.msgClass} break-words`}>{e.message}</p>

                  {e.imageUrl && (
                    <button
                      onClick={() => setLightbox(e.imageUrl!)}
                      className="mt-2 block rounded-xl overflow-hidden border border-slate-200 hover:border-green-400 hover:shadow-md transition-all cursor-zoom-in max-w-md"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={e.imageUrl} alt={e.message} loading="lazy" className="w-full object-contain bg-slate-50" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[200] bg-black/85 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button
            className="absolute top-4 right-4 p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
            onClick={() => setLightbox(null)}
          >
            <X className="w-6 h-6" />
          </button>
          <a
            href={lightbox}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(ev) => ev.stopPropagation()}
            className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 text-sm"
          >
            <ExternalLink className="w-4 h-4" /> Open original
          </a>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="Screenshot"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(ev) => ev.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
