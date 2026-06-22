"use client";

import { Users } from "lucide-react";
import { TeamSettings } from "@/app/dashboard/settings/components/TeamSettings";

export default function TeamPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 md:px-6 max-w-5xl">
          <div className="flex items-center gap-3 py-5">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-green-700 to-green-500 text-white shadow-md shadow-green-700/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Team Members</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Invite people and manage permissions for your account</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 max-w-5xl py-6">
        <TeamSettings />
      </div>
    </div>
  );
}
