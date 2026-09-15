"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Image as ImageIcon,
  Lock,
  ExternalLink,
  Eye,
  EyeOff,
  Calendar,
  ShieldCheck,
  Copy,
  Check,
  KeyRound,
  Camera,
  Share2,
} from "lucide-react";

interface GalleryItem {
  id: number;
  event_id: number;
  title: string;
  slug: string;
  pin_code?: string;
  event_name: string;
  event_date?: string;
  thumbnailUrl?: string | null;
  photos_count: number;
  views_count: number;
  created_at: string;
}

interface GalleriesListClientProps {
  galleries: GalleryItem[];
}

export function GalleriesListClient({ galleries }: GalleriesListClientProps) {
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [copiedPinSlug, setCopiedPinSlug] = useState<string | null>(null);
  const [revealedPins, setRevealedPins] = useState<Set<string>>(() => new Set());

  function copyGalleryUrl(slug: string) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const fullUrl = `${origin}/gallery/${slug}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2500);
  }

  function copyPinCode(slug: string, pin?: string) {
    if (!pin) return;
    navigator.clipboard.writeText(pin);
    setCopiedPinSlug(slug);
    setTimeout(() => setCopiedPinSlug(null), 2500);
  }

  function togglePinReveal(slug: string) {
    setRevealedPins((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
     

      {/* Empty State */}
      {galleries.length === 0 ? (
        <div className="bg-white p-16 text-center rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6 text-indigo-600" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No published galleries yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Open any shoot event, select the best photos, and click &ldquo;Publish Client PIN Gallery&rdquo; to generate a secure client proofing portal.
          </p>
          <Link
            href="/events"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-studio-accent active:scale-[0.98] text-white text-xs font-semibold rounded-xl transition-all"
          >
            Browse Shoots
          </Link>
        </div>
      ) : (
        /* Galleries Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {galleries.map((gallery) => {
            const fullUrl = typeof window !== "undefined" ? `${window.location.origin}/gallery/${gallery.slug}` : `/gallery/${gallery.slug}`;
            const isLinkCopied = copiedSlug === gallery.slug;
            const isPinCopied = copiedPinSlug === gallery.slug;

            return (
              <div
                key={gallery.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-xl hover:border-indigo-300 transition-all flex flex-col justify-between overflow-hidden group"
              >
                <div>
                  {/* Gallery Cover Thumbnail */}
                  <div className="relative aspect-16/9 bg-slate-950 overflow-hidden border-b border-slate-100">
                    {gallery.thumbnailUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={gallery.thumbnailUrl}
                        alt={gallery.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 space-y-1">
                        <Camera className="w-8 h-8 text-slate-600" />
                        <span className="text-[11px] font-medium">No Thumbnail</span>
                      </div>
                    )}

                    {/* Gradient Overlay & Header Badges */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-between p-3.5">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/90 text-white backdrop-blur-md shadow-xs flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>PIN Protected</span>
                        </span>

                        {/* View Count Badge */}
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-black/60 text-white backdrop-blur-md border border-white/20 flex items-center gap-1 font-mono">
                          <Eye className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{gallery.views_count || 0} Views</span>
                        </span>
                      </div>

                      {/* Photo Count */}
                      <div className="flex items-center justify-between text-white text-xs font-medium">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/50 backdrop-blur-md text-[11px] font-semibold border border-white/10">
                          <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{gallery.photos_count || 0} Photos Delivered</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="p-5 space-y-3.5">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 leading-snug group-hover:text-indigo-600 transition-colors">
                        {gallery.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Shoot: <span className="font-semibold text-slate-800">{gallery.event_name}</span>
                      </p>
                    </div>

                    {/* Security PIN Code Display & Eye Toggle & Copy */}
                    {(() => {
                      const isRevealed = revealedPins.has(gallery.slug);
                      const pinVal = gallery.pin_code || "4497";
                      const displayPin = isRevealed ? pinVal : "• ".repeat(pinVal.length);

                      return (
                        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                              <KeyRound className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block leading-none">
                                Client Keypad PIN
                              </span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs font-mono font-black text-slate-900 tracking-wider">
                                  {displayPin}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => togglePinReveal(gallery.slug)}
                                  className="p-1 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                                  title={isRevealed ? "Hide PIN" : "Reveal PIN"}
                                >
                                  {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => copyPinCode(gallery.slug, pinVal)}
                            className="px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:text-indigo-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                            title="Copy PIN Code"
                          >
                            {isPinCopied ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span className="text-emerald-600">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy PIN</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Footer Action Bar */}
                <div className="p-3.5 bg-slate-50/90 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => copyGalleryUrl(gallery.slug)}
                    className="flex-1 py-2 px-2.5 text-xs font-bold text-slate-700 hover:text-indigo-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                    title="Copy Full Shareable Link"
                  >
                    {isLinkCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600">Copied Link!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>

                  <Link
                    href={`/gallery/${gallery.slug}`}
                    target="_blank"
                    className="flex-1 py-2 px-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] rounded-xl transition-all text-center flex items-center justify-center gap-1.5 shadow-xs"
                    title="Open Live Client Proofing Portal"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Live View</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
