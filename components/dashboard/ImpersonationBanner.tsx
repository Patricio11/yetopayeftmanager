"use client";

import { useState, useEffect } from "react";
import { Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface ImpersonationTarget {
  id: string;
  name: string;
  email: string;
  role: string;
  companyName?: string;
}

export function ImpersonationBanner() {
  const router = useRouter();
  const [target, setTarget] = useState<ImpersonationTarget | null>(null);
  const [stopping, setStopping] = useState(false);

  useEffect(() => {
    fetch("/api/admin/impersonate")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.impersonating) {
          setTarget(data.target);
        }
      })
      .catch(() => {});
  }, []);

  if (!target) return null;

  const handleStop = async () => {
    setStopping(true);
    try {
      await fetch("/api/admin/impersonate", { method: "DELETE" });
      setTarget(null);
      router.push("/dashboard/admin/merchants");
      router.refresh();
    } catch {
      setStopping(false);
    }
  };

  return (
    <div className="bg-purple-600 text-white text-sm sticky top-0 z-[60]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4" />
          <span>
            Viewing as <strong>{target.companyName || target.name}</strong>{" "}
            <span className="opacity-75">({target.email} &middot; {target.role})</span>
          </span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleStop}
          disabled={stopping}
          className="text-white hover:bg-purple-700 gap-1.5"
        >
          <X className="w-3.5 h-3.5" />
          {stopping ? "Stopping..." : "Stop Impersonating"}
        </Button>
      </div>
    </div>
  );
}
