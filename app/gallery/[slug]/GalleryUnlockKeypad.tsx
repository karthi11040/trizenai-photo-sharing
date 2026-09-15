"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { verifyGalleryPinAction } from "@/app/actions/galleries";
import {
  Shield,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  MapPin,
  Calendar,
  Lock,
  RotateCcw,
  CheckCircle2,
  Loader2,
  KeyRound,
} from "lucide-react";

interface KeypadProps {
  slug: string;
  galleryTitle: string;
  eventName: string;
  eventDate?: string | null;
  eventLocation?: string | null;
  coverThumbnail?: string | null;
  studioName?: string | null;
  pinLength?: number;
}

export function GalleryUnlockKeypad({
  slug,
  galleryTitle,
  eventName,
  eventDate,
  eventLocation,
  coverThumbnail,
  studioName,
  pinLength: initialPinLength = 4,
}: KeypadProps) {
  const router = useRouter();
  
  const targetLength = initialPinLength > 0 ? initialPinLength : 4;
  const [pinLength, setPinLength] = useState<number>(targetLength);
  const [pinDigits, setPinDigits] = useState<string[]>(Array(targetLength).fill(""));
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Update pin state if initialPinLength changes
  useEffect(() => {
    const len = initialPinLength > 0 ? initialPinLength : 4;
    setPinLength(len);
    setPinDigits(Array(len).fill(""));
  }, [initialPinLength]);


  // Focus first input box on initial mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const fullPin = pinDigits.join("");
  const isPinComplete = fullPin.length === pinLength && pinDigits.every((d) => d !== "");

  const handleUnlock = useCallback(
    async (codeToVerify?: string) => {
      const code = codeToVerify ?? pinDigits.join("");
      if (!code || code.length < 4) {
        setError(`Please enter your ${pinLength}-digit security PIN.`);
        return;
      }

      setLoading(true);
      setError(null);
      setRateLimited(false);

      try {
        const res = await verifyGalleryPinAction(slug, code);

        if (res.error) {
          setLoading(false);
          // Check for rate limit or incorrect pin
          if (res.error.toLowerCase().includes("too many") || res.error.toLowerCase().includes("rate limit") || res.error.toLowerCase().includes("lockout")) {
            setRateLimited(true);
            setError("Too many attempts. Please wait a moment before trying again.");
          } else {
            setError("Incorrect PIN. Please try again.");
          }
        } else if (res.sessionToken) {
          setSuccess(true);
          setTimeout(() => {
            router.push(`/gallery/${slug}/${res.sessionToken}`);
          }, 300);
        }
      } catch {
        setLoading(false);
        setError("Unable to verify PIN. Please try again.");
      }
    },
    [pinDigits, pinLength, slug, router]
  );

  const handleDigitChange = (index: number, value: string) => {
    if (loading || success) return;

    if (!value) {
      const updated = [...pinDigits];
      updated[index] = "";
      setPinDigits(updated);
      setError(null);
      return;
    }

    // Take the last character typed (allows digits & letters for custom PINs)
    const char = value.slice(-1);
    const updated = [...pinDigits];
    updated[index] = char;
    setPinDigits(updated);
    setError(null);

    // Auto-advance to next input field
    if (index < pinLength - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto verify when all required digits are provided
    const newFullPin = updated.join("");
    if (newFullPin.length === pinLength && updated.every((d) => d !== "")) {
      setTimeout(() => handleUnlock(newFullPin), 150);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (loading || success) return;

    if (e.key === "Backspace") {
      if (!pinDigits[index] && index > 0) {
        const updated = [...pinDigits];
        updated[index - 1] = "";
        setPinDigits(updated);
        inputRefs.current[index - 1]?.focus();
      } else {
        const updated = [...pinDigits];
        updated[index] = "";
        setPinDigits(updated);
      }
      setError(null);
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < pinLength - 1) {
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === "Enter" && isPinComplete) {
      handleUnlock();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (loading || success) return;

    const pastedData = e.clipboardData.getData("text").trim();
    if (!pastedData) return;

    const trimmedData = pastedData.slice(0, pinLength);
    const updated = Array(pinLength).fill("");
    for (let i = 0; i < trimmedData.length; i++) {
      updated[i] = trimmedData[i];
    }
    setPinDigits(updated);
    setError(null);

    const nextIndex = Math.min(trimmedData.length, pinLength - 1);
    inputRefs.current[nextIndex]?.focus();

    if (trimmedData.length === pinLength) {
      setTimeout(() => handleUnlock(trimmedData), 150);
    }
  };

  const handleClear = () => {
    setPinDigits(Array(pinLength).fill(""));
    setError(null);
    inputRefs.current[0]?.focus();
  };

  const formattedDate = eventDate
    ? new Date(eventDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  return (
    <div className="w-full max-w-[1240px] mx-auto">
      {/* Main Luxury Central Card Container (Clean Light Theme) */}
      <div className="relative bg-white rounded-[28px] sm:rounded-[32px] shadow-[0_25px_70px_rgba(0,0,0,0.08)] border border-slate-200/80 overflow-hidden min-h-[520px] lg:min-h-[580px] grid grid-cols-1 lg:grid-cols-12">
        
        {/* LEFT PANEL: PHOTO PANEL (50–55% width) */}
        <div className="lg:col-span-6 relative min-h-[360px] lg:min-h-[580px] bg-slate-950 overflow-hidden flex flex-col justify-end p-6 sm:p-10 text-white">
          {coverThumbnail ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverThumbnail}
                alt={galleryTitle}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 scale-100 hover:scale-105"
              />
              {/* Dark Gradient Overlay for Readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-slate-950/10 pointer-events-none" />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950" />
          )}

          {/* Top Left Studio Badge on Photo */}
          <div className="absolute top-6 left-6 z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/60 backdrop-blur-md border border-white/15 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-300 shadow-xs">
              <Lock className="w-3 h-3 text-amber-400" />
              <span>Private Proofing</span>
            </span>
          </div>

          {/* Bottom Photo Metadata */}
          <div className="relative z-10 space-y-2 max-w-lg">
            <span className="text-xs font-mono font-bold tracking-[0.25em] text-slate-300 uppercase block">
              {studioName || "ES STUDIOS"}
            </span>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white font-serif tracking-tight leading-tight drop-shadow-md">
              {galleryTitle || eventName}
            </h1>

            <div className="flex items-center gap-4 text-xs text-slate-300/90 font-medium pt-1 border-t border-white/15">
              {eventLocation && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>{eventLocation}</span>
                </div>
              )}
              {eventLocation && formattedDate && (
                <span className="text-white/30">&bull;</span>
              )}
              {formattedDate && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>{formattedDate}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: SECURITY PANEL (45–50% width) - Crisp White Theme */}
        <div className="lg:col-span-6 bg-white p-6 sm:p-10 lg:p-12 flex flex-col justify-between text-slate-900 space-y-6">
          
          {/* Top Pill & Headings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-extrabold uppercase tracking-widest">
                <Shield className="w-3.5 h-3.5 text-slate-900" />
                <span>PROTECTED GALLERY</span>
              </div>

              {/* Format Badge based on Admin Created PIN */}
              <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-lg border border-slate-200/80 text-[11px] font-extrabold text-slate-700">
                <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                <span>{initialPinLength}-Digit Access PIN</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-serif">
                Enter Security PIN
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-md">
                Enter the {initialPinLength}-digit security code created by your studio to unlock your gallery.
              </p>
            </div>
          </div>

          {/* Segmented PIN Input Console */}
          <div className="space-y-4">
            {/* Dynamic 4 or 6 Box Input Grid */}
            <div className="flex items-center justify-between gap-2 sm:gap-3 max-w-md mx-auto lg:mx-0">
              {Array.from({ length: pinLength }).map((_, idx) => {
                const digit = pinDigits[idx] || "";
                const isFilled = digit !== "";

                return (
                  <input
                    key={idx}
                    ref={(el) => {
                      inputRefs.current[idx] = el;
                    }}
                    type={showPin ? "text" : "password"}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    disabled={loading || success}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    onPaste={handlePaste}
                    aria-label={`PIN Digit ${idx + 1} of ${pinLength}`}
                    className={`${
                      pinLength === 4
                        ? "w-14 sm:w-[72px] h-16 sm:h-[80px] text-3xl"
                        : "w-11 sm:w-[60px] lg:w-[64px] h-14 sm:h-[68px] lg:h-[72px] text-2xl sm:text-3xl"
                    } rounded-xl text-center font-mono font-black transition-all outline-none duration-150 ${
                      isFilled
                        ? "bg-slate-900 border-2 border-slate-900 text-white shadow-md"
                        : "bg-slate-50/80 border-2 border-slate-200 text-slate-900 focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-600/10 shadow-inner"
                    } disabled:opacity-50`}
                  />
                );
              })}
            </div>

            {/* Input Utilities: Reveal PIN / Clear */}
            <div className="flex items-center justify-between text-xs text-slate-500 max-w-md mx-auto lg:mx-0 px-1">
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-semibold cursor-pointer transition-colors py-1 px-1 rounded-md"
                aria-label={showPin ? "Hide PIN digits" : "Show PIN digits"}
              >
                {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPin ? "Hide PIN" : "Show PIN"}</span>
              </button>

              {pinDigits.some((d) => d !== "") && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-700 text-[11px] font-medium cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {/* Error / Rate Limit Message Display */}
            {error && (
              <div
                role="alert"
                className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 max-w-md mx-auto lg:mx-0 animate-shake motion-reduce:animate-none ${
                  rateLimited
                    ? "bg-amber-50 border border-amber-200 text-amber-900"
                    : "bg-red-50 border border-red-200 text-red-700"
                }`}
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span className="font-semibold">{error}</span>
              </div>
            )}
          </div>

          {/* Actions & Microcopy */}
          <div className="space-y-5 pt-2">
            {/* Primary Action Button */}
            <button
              type="button"
              disabled={loading || !isPinComplete || success}
              onClick={() => handleUnlock()}
              className="w-full min-h-[52px] h-[52px] bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-slate-900 flex items-center justify-center gap-2 cursor-pointer tracking-wider uppercase"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Verifying PIN...</span>
                </>
              ) : success ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Gallery Unlocked</span>
                </>
              ) : (
                <>
                  <span>Unlock Private Gallery</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Security Microcopy */}
            <div className="flex items-center justify-center lg:justify-start gap-2 text-xs text-slate-400 pt-1">
              <Shield className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <div className="flex flex-col">
                <span className="font-semibold text-slate-600">Secure private gallery access</span>
                <span className="text-[11px] text-slate-400">Your gallery is protected and photographs are securely delivered.</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}


