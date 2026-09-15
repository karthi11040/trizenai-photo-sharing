"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { changePasswordAction } from "@/app/actions/auth";
import {
  Lock,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  KeyRound,
  Eye,
  EyeOff,
  Check,
  X,
} from "lucide-react";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Strong password requirements check
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  // Score 0 to 4
  const criteriaMetCount = [hasMinLength, hasUpper && hasLower, hasNumber, hasSpecial].filter(Boolean).length;
  
  let strengthLabel = "Too Weak";
  let strengthColor = "bg-red-500";
  let strengthTextColor = "text-red-600";

  if (password.length === 0) {
    strengthLabel = "";
    strengthColor = "bg-slate-200";
  } else if (criteriaMetCount === 1 || password.length < 8) {
    strengthLabel = "Weak";
    strengthColor = "bg-red-500";
    strengthTextColor = "text-red-600";
  } else if (criteriaMetCount === 2) {
    strengthLabel = "Fair";
    strengthColor = "bg-amber-500";
    strengthTextColor = "text-amber-600";
  } else if (criteriaMetCount === 3) {
    strengthLabel = "Strong";
    strengthColor = "bg-emerald-500";
    strengthTextColor = "text-emerald-600";
  } else if (criteriaMetCount === 4) {
    strengthLabel = "Very Strong";
    strengthColor = "bg-indigo-600";
    strengthTextColor = "text-indigo-600";
  }

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const isFormValid = hasMinLength && passwordsMatch && !loading;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("password", password);
    formData.append("confirm_password", confirmPassword);

    try {
      const res = await changePasswordAction(formData);
      if (res.error) {
        setError(res.error);
        setLoading(false);
      } else if (res.redirectUrl) {
        router.push(res.redirectUrl);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mb-2">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Set New Password
          </h1>
          <p className="text-sm text-slate-500">
            Please set a strong password to secure your account.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-700 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* New Password Field */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              New Password *
            </label>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all font-mono"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              
              {/* Eye Toggle */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Password Strength Progress Bar */}
            {password.length > 0 && (
              <div className="mt-2.5 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-500">Strength</span>
                  <span className={strengthTextColor}>{strengthLabel}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                  <div
                    className={`h-full transition-all duration-300 ${strengthColor}`}
                    style={{ width: `${(criteriaMetCount / 4) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Confirm Password *
              </label>
              {passwordsMatch && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                  <Check className="w-3 h-3" /> Matches
                </span>
              )}
              {passwordsMismatch && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600">
                  <X className="w-3 h-3" /> Mismatch
                </span>
              )}
            </div>

            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirm_password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError(null);
                }}
                placeholder="••••••••••••"
                className={`w-full pl-10 pr-11 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 transition-all font-mono ${
                  passwordsMismatch
                    ? "border-red-300 focus:ring-red-500"
                    : passwordsMatch
                    ? "border-emerald-300 focus:ring-emerald-500"
                    : "border-slate-200 focus:ring-slate-900"
                }`}
              />
              <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              
              {/* Eye Toggle */}
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Dynamic Requirements Checklist */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] space-y-2">
            <p className="font-extrabold uppercase tracking-wider text-slate-600 text-[10px]">
              Security Checklist:
            </p>
            <div className="grid grid-cols-2 gap-1.5 text-slate-600 font-medium">
              <div className="flex items-center gap-1.5">
                {hasMinLength ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-1 shrink-0" />
                )}
                <span className={hasMinLength ? "text-slate-900 font-bold" : ""}>Min 8 characters</span>
              </div>

              <div className="flex items-center gap-1.5">
                {hasUpper && hasLower ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-1 shrink-0" />
                )}
                <span className={hasUpper && hasLower ? "text-slate-900 font-bold" : ""}>Upper & Lower case</span>
              </div>

              <div className="flex items-center gap-1.5">
                {hasNumber ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-1 shrink-0" />
                )}
                <span className={hasNumber ? "text-slate-900 font-bold" : ""}>Numbers (0-9)</span>
              </div>

              <div className="flex items-center gap-1.5">
                {hasSpecial ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-1 shrink-0" />
                )}
                <span className={hasSpecial ? "text-slate-900 font-bold" : ""}>Special symbol (!@#$)</span>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!isFormValid}
            className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-extrabold text-xs sm:text-sm uppercase tracking-wider rounded-xl shadow-md transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Save Password & Access Studio</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
