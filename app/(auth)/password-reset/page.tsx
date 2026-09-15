"use client";

import { useState } from "react";
import Link from "next/link";
import { resetPasswordAction } from "@/app/actions/auth";
import { Mail, ArrowRight, AlertCircle, CheckCircle2, ShieldAlert } from "lucide-react";

export default function PasswordResetPage() {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const res = await resetPasswordAction(formData);

    if (res.error) {
      setError(res.error);
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2.5 py-1 rounded-md">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Account Recovery</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
          Reset Password
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
          Enter your registered studio email address and we&apos;ll send instructions to reset your password.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200/80 text-red-700 text-xs font-semibold flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Success State or Form */}
      {sent ? (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs sm:text-sm flex items-start gap-3 shadow-xs">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Instructions Sent!</p>
              <p className="text-emerald-700 leading-relaxed">
                If an account with that email exists, we&apos;ve sent instructions to reset your password. Please check your inbox.
              </p>
            </div>
          </div>
          <Link
            href="/login"
            className="block w-full text-center py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md"
          >
            Return to Sign In
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} method="POST" className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Email Address *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                name="email"
                required
                placeholder="admin@studio.com"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[48px] py-3 px-4 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-extrabold text-xs sm:text-sm uppercase tracking-wider rounded-xl shadow-md transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Send Reset Link</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}

      {/* Footer Nav Links */}
      <div className="pt-4 border-t border-slate-100 text-center">
        <Link href="/login" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
          &larr; Back to Sign In
        </Link>
      </div>
    </div>
  );
}
