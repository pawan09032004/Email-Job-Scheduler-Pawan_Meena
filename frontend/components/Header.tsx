"use client";

import { signOut, useSession } from "next-auth/react";
import { Mail, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-50 h-20 bg-white shadow-sm border-b border-slate-200">
      <div className="h-full px-6 flex items-center justify-between">
        {/* Logo Section */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
            <Mail className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Email Job Scheduler
          </h1>
        </div>

        {/* Right Section (Logout only) */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
