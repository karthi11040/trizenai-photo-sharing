"use client";

import { ShieldAlert, LogOut, Lock, CalendarX, ImageOff, UserX, HelpCircle } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { useState } from "react";

interface SuspendedAccountModalProps {
  status?: string;
}

export function SuspendedAccountModal({ status = "SUSPENDED" }: SuspendedAccountModalProps) {
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await logoutAction();
  }

  const isInactive = status === "INACTIVE";
  const statusLabel = isInactive ? "Account Inactive" : status === "PENDING" ? "Pending Activation" : "Account Suspended";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="suspended-dialog-title"
      aria-describedby="suspended-dialog-desc"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs select-none animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 text-left space-y-5">
        {/* Header Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200/80 dark:border-red-900/60 text-red-600 dark:text-red-400 flex items-center justify-center shadow-2xs">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-200/80 dark:border-red-900/50">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              {statusLabel}
            </span>
          </div>

          <div className="space-y-1">
            <h2 id="suspended-dialog-title" className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight">
              Access Restricted
            </h2>
            <p id="suspended-dialog-desc" className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Your team member profile is currently <strong className="font-semibold text-slate-800 dark:text-slate-200">{status}</strong>. Access to all studio workspace features and functions is disabled.
            </p>
          </div>
        </div>

        {/* Restricted Capabilities Card */}
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 space-y-3">
          <span className="text-xs font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            Restricted Capabilities
          </span>
          <div className="grid gap-2 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-start gap-2.5">
              <CalendarX className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <span>Assigned photoshoot events & event schedules</span>
            </div>
            <div className="flex items-start gap-2.5">
              <ImageOff className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <span>Photo uploads, gallery management & client downloads</span>
            </div>
            <div className="flex items-start gap-2.5">
              <UserX className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <span>Team collaboration tools & studio settings</span>
            </div>
          </div>
        </div>

        {/* Support Note */}
        <div className="flex items-start gap-2.5 text-xs text-slate-500 dark:text-slate-400 bg-amber-50/50 dark:bg-amber-950/20 p-3 rounded-lg border border-amber-200/50 dark:border-amber-900/30">
          <HelpCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="leading-snug">
            Need access restored? Contact your studio manager or administrator to update your account status.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="pt-1">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 dark:bg-slate-100 dark:hover:bg-white dark:active:bg-slate-200 text-white dark:text-slate-900 font-medium text-xs sm:text-sm rounded-lg shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loggingOut ? (
              <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <LogOut className="w-4 h-4" />
                <span>Sign Out from Workspace</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

