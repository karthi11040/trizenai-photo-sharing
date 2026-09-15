"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import type { Photo } from "@/types/database";
import {
  Camera,
  Download,
  Heart,
  Eye,
  Share2,
  Calendar,
  MapPin,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Play,
  Pause,
  Maximize2,
  Minimize2,
  Grid3X3,
  LayoutGrid,
  Columns,
  Sparkles,
  Palette,
  Check,
  Copy,
  QrCode,
  Send,
  MessageSquare,
  Info,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  SlidersHorizontal,
  Lock,
} from "lucide-react";
import { EventStatusBadge } from "@/components/events/EventStatusBadge";

type GalleryTheme = "obsidian" | "linen" | "amber";
type LayoutMode = "dynamic" | "masonry" | "balanced" | "dense" | "narrative";

interface ClientGalleryViewProps {
  gallery: any;
  photos: (Photo & { signedUrl?: string })[];
  slug: string;
}

export function ClientGalleryView({ gallery, photos, slug }: ClientGalleryViewProps) {
  // Theme state - Default to White/Linen Theme
  const [theme, setTheme] = useState<GalleryTheme>("linen");
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("dynamic");
  const [activeTab, setActiveTab] = useState<"all" | "favorites">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [aspectRatios, setAspectRatios] = useState<Record<number, number>>({});

  const handleImageLoad = (id: number, img: HTMLImageElement) => {
    if (img.naturalWidth && img.naturalHeight) {
      const ratio = img.naturalWidth / img.naturalHeight;
      setAspectRatios((prev) => (prev[id] === ratio ? prev : { ...prev, [id]: ratio }));
    }
  };

  // Favorites / Proofing State
  const [favorites, setFavorites] = useState<Set<number>>(() => new Set());
  const [photoNotes, setPhotoNotes] = useState<Record<number, string>>({});
  const [mounted, setMounted] = useState(false);

  // Lightbox & Slideshow State
  const [activePhotoIdx, setActivePhotoIdx] = useState<number | null>(null);
  const [isPlayingSlideshow, setIsPlayingSlideshow] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showExifInfo, setShowExifInfo] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Modals
  const [showShareModal, setShowShareModal] = useState(false);
  const [showProofingSubmitModal, setShowProofingSubmitModal] = useState(false);
  const [showNoteModalForPhoto, setShowNoteModalForPhoto] = useState<Photo | null>(null);
  const [currentNoteText, setCurrentNoteText] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [clientSubmissionSuccess, setClientSubmissionSuccess] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock background page scroll & touch events when Lightbox modal is open
  useEffect(() => {
    const isModalOpen = activePhotoIdx !== null || showShareModal || showProofingSubmitModal || showNoteModalForPhoto !== null;
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
    } else {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    };
  }, [activePhotoIdx, showShareModal, showProofingSubmitModal, showNoteModalForPhoto]);

  // Filtered photos based on active tab and search query
  const filteredPhotos = useMemo(() => {
    return photos.filter((photo, idx) => {
      if (activeTab === "favorites" && !favorites.has(photo.id)) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const filename = (photo.filename || "").toLowerCase();
        const originalName = ((photo as any).original_name || "").toLowerCase();
        const title = ((photo as any).title || "").toLowerCase();
        const caption = ((photo as any).caption || "").toLowerCase();
        const note = (photoNotes[photo.id] || "").toLowerCase();
        const idxStr = `${idx + 1}`;
        const hashIdx = `#${idx + 1}`;

        return (
          filename.includes(q) ||
          originalName.includes(q) ||
          title.includes(q) ||
          caption.includes(q) ||
          note.includes(q) ||
          idxStr === q ||
          hashIdx === q
        );
      }
      return true;
    });
  }, [photos, activeTab, favorites, searchQuery, photoNotes]);

  // Favorite toggle
  const toggleFavorite = useCallback((id: number) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Lightbox navigation
  const handlePrev = useCallback(() => {
    if (activePhotoIdx !== null && activePhotoIdx > 0) {
      setActivePhotoIdx(activePhotoIdx - 1);
      setZoomLevel(1);
    }
  }, [activePhotoIdx]);

  const handleNext = useCallback(() => {
    if (activePhotoIdx !== null && activePhotoIdx < photos.length - 1) {
      setActivePhotoIdx(activePhotoIdx + 1);
      setZoomLevel(1);
    }
  }, [activePhotoIdx, photos.length]);

  // Slideshow auto-advance
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlayingSlideshow && activePhotoIdx !== null) {
      timer = setTimeout(() => {
        if (activePhotoIdx < photos.length - 1) {
          setActivePhotoIdx(activePhotoIdx + 1);
        } else {
          setActivePhotoIdx(0); // loop back
        }
      }, 4000);
    }
    return () => clearTimeout(timer);
  }, [isPlayingSlideshow, activePhotoIdx, photos.length]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  // Keyboard navigation for lightbox
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (activePhotoIdx === null) return;

      if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "Escape") {
        setActivePhotoIdx(null);
        setIsPlayingSlideshow(false);
      } else if (e.key === " ") {
        e.preventDefault();
        setIsPlayingSlideshow((prev) => !prev);
      } else if (e.key.toLowerCase() === "h" || e.key.toLowerCase() === "f") {
        const curPhoto = photos[activePhotoIdx];
        if (curPhoto) toggleFavorite(curPhoto.id);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activePhotoIdx, handlePrev, handleNext, photos, toggleFavorite]);

  // Copy share URL
  function handleCopyShare() {
    const fullUrl = typeof window !== "undefined" ? window.location.href.split("/").slice(0, -1).join("/") : "";
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  }

  // Export Favorites as text file
  function handleExportFavorites() {
    const favPhotos = photos.filter((p) => favorites.has(p.id));
    const lines = [
      `Proofing Selections for: ${gallery.title}`,
      `Shoot: ${gallery.event_name}`,
      `Selected Count: ${favPhotos.length} photos`,
      `Exported: ${new Date().toLocaleString()}`,
      `----------------------------------------`,
      ...favPhotos.map((p, i) => `${i + 1}. ${p.filename} ${photoNotes[p.id] ? `(Note: ${photoNotes[p.id]})` : ""}`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${gallery.title.replace(/\s+/g, "_")}_proofing_selections.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Submit Selections Handler
  function handleProofingSubmit(e: React.FormEvent) {
    e.preventDefault();
    setClientSubmissionSuccess(true);
    setTimeout(() => {
      setShowProofingSubmitModal(false);
      setClientSubmissionSuccess(false);
    }, 2000);
  }

  // Theme style mappings
  const themeStyles = useMemo(() => {
    switch (theme) {
      case "linen":
      default:
        return {
          wrapper: "bg-white text-slate-900",
          header: "bg-white/95 border-slate-200 text-slate-900 shadow-xs",
          card: "bg-slate-50 border-slate-200/80 shadow-sm hover:shadow-2xl hover:border-slate-300",
          accent: "bg-slate-900 text-white hover:bg-slate-800 font-bold shadow-sm",
          subtext: "text-slate-500",
          badge: "bg-slate-100 text-slate-800 border-slate-200",
          pillActive: "bg-slate-900 text-white font-bold shadow-xs",
          pillInactive: "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/60",
          heroGrad: "from-slate-50 via-white to-white",
        };
      case "amber":
        return {
          wrapper: "bg-[#0C0806] text-[#F3EBE6]",
          header: "bg-[#0C0806]/90 border-[#2A1B14] text-[#F3EBE6]",
          card: "bg-[#18110D] border-[#2E1F17] shadow-lg hover:shadow-amber-500/10",
          accent: "bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold",
          subtext: "text-[#A89487]",
          badge: "bg-[#251810] text-amber-300 border-amber-900/50",
          pillActive: "bg-amber-500 text-slate-950 font-bold",
          pillInactive: "bg-[#221610] text-[#BCAAA4] hover:bg-[#2F1F17]",
          heroGrad: "from-amber-950/40 via-[#0C0806] to-[#0C0806]",
        };
      case "obsidian":
        return {
          wrapper: "bg-[#080B10] text-slate-100",
          header: "bg-[#080B10]/90 border-slate-800 text-white",
          card: "bg-slate-900/90 border-slate-800/90 shadow-xl hover:shadow-indigo-500/10",
          accent: "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 hover:from-amber-300 hover:to-amber-400 font-bold",
          subtext: "text-slate-400",
          badge: "bg-slate-800/80 text-amber-300 border-slate-700",
          pillActive: "bg-amber-400 text-slate-950 font-bold",
          pillInactive: "bg-slate-800/80 text-slate-300 hover:bg-slate-700",
          heroGrad: "from-slate-900 via-[#080B10] to-[#080B10]",
        };
    }
  }, [theme]);

  // Cover Image
  const coverUrl = photos[0]?.signedUrl || (photos[0]?.storage_path ? `/media/${photos[0].storage_path}` : null);

  return (
    <div className={`min-h-screen ${themeStyles.wrapper} flex flex-col justify-between transition-colors duration-500 selection:bg-amber-400 selection:text-slate-950 font-sans`}>
      {/* Top Header Bar */}
      <header className={`sticky top-0 z-40 ${themeStyles.header} backdrop-blur-xl border-b px-4 sm:px-8 py-3.5 transition-colors duration-300 shadow-sm`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Studio Brand & Title */}
          <div className="flex items-center gap-3.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={gallery.studio_logo || "/img/logo.png"}
              alt={gallery.studio_name || "Studio"}
              className="h-8 max-h-8 w-auto max-w-[130px] object-contain rounded-md"
            />
            <div className="hidden sm:block border-l border-slate-700/40 pl-3">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm tracking-tight leading-tight">
                  {gallery.title}
                </h2>
                <EventStatusBadge
                  event={{
                    event_date: gallery.event_date,
                    start_time: gallery.event_start_time,
                    end_time: gallery.event_end_time,
                    status: gallery.event_status,
                    photos_count: photos.length,
                  }}
                  size="sm"
                />
              </div>
              <span className={`text-[11px] ${themeStyles.subtext} block`}>
                {gallery.studio_name || "TrizenAI Studios"} &bull; {photos.length} High-Res Photos
              </span>
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme Selector Pill */}
            <div className="relative group">
              <button
                type="button"
                className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-white/10 ${themeStyles.pillInactive} transition-all cursor-pointer`}
                title="Change Gallery Theme"
              >
                <Palette className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline capitalize">{theme} Theme</span>
              </button>
              <div className="absolute right-0 top-full mt-2 w-44 rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl p-1.5 hidden group-hover:block animate-in fade-in zoom-in-95 duration-150 z-50 text-white">
                <button
                  type="button"
                  onClick={() => setTheme("obsidian")}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer ${theme === "obsidian" ? "bg-amber-400 text-slate-950" : "hover:bg-slate-800 text-slate-200"}`}
                >
                  <span>✨ Obsidian Dark</span>
                  {theme === "obsidian" && <Check className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("linen")}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer ${theme === "linen" ? "bg-amber-400 text-slate-950" : "hover:bg-slate-800 text-slate-200"}`}
                >
                  <span>🏛️ Editorial Linen</span>
                  {theme === "linen" && <Check className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("amber")}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer ${theme === "amber" ? "bg-amber-400 text-slate-950" : "hover:bg-slate-800 text-slate-200"}`}
                >
                  <span>🌅 Warm Amber</span>
                  {theme === "amber" && <Check className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Start Slideshow CTA */}
            {photos.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setActivePhotoIdx(0);
                  setIsPlayingSlideshow(true);
                }}
                className={`hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold ${themeStyles.accent} shadow-sm transition-all cursor-pointer`}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Slideshow</span>
              </button>
            )}

            {/* Share Button */}
            <button
              type="button"
              onClick={() => setShowShareModal(true)}
              className={`p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-white/10 ${themeStyles.pillInactive} transition-all cursor-pointer`}
              title="Share Gallery"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Share</span>
            </button>

            {/* Exit / Lock */}
            <Link
              href={`/gallery/${slug}`}
              className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold bg-red-950/40 text-red-300 hover:bg-red-900/60 border border-red-800/40 transition-colors flex items-center gap-1.5"
              title="Lock Gallery"
            >
              <Lock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lock</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 w-full space-y-8 flex-1">
        {/* Hero Section */}
        <section className={`relative rounded-3xl overflow-hidden p-6 sm:p-12 bg-gradient-to-b ${themeStyles.heroGrad} border border-white/10 text-center shadow-xl space-y-4`}>
          {coverUrl && (
            <div
              className="absolute inset-0 bg-cover bg-center opacity-15 filter blur-2xl scale-110 pointer-events-none"
              style={{ backgroundImage: `url(${coverUrl})` }}
            />
          )}

          <div className="relative z-10 max-w-3xl mx-auto space-y-3">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${themeStyles.badge}`}>
              <Sparkles className="w-3.5 h-3.5" />
              <span>{gallery.studio_name || "TrizenAI Studios"} Showcase</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight font-serif leading-tight">
              {gallery.title}
            </h1>

            <p className={`text-sm sm:text-base ${themeStyles.subtext} font-medium max-w-xl mx-auto`}>
              High-resolution photographs for <span className="font-bold underline decoration-amber-400">{gallery.event_name}</span>. Click any photograph to inspect in crystal-clear full resolution, mark proofing selections, or download.
            </p>

            {/* Metadata Badges */}
            <div className={`flex flex-wrap items-center justify-center gap-4 pt-2 text-xs font-medium ${themeStyles.subtext}`}>
              <EventStatusBadge
                event={{
                  event_date: gallery.event_date,
                  start_time: gallery.event_start_time,
                  end_time: gallery.event_end_time,
                  status: gallery.event_status,
                  photos_count: photos.length,
                }}
                size="md"
              />

              {gallery.event_date && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>{new Date(gallery.event_date).toLocaleDateString(undefined, { dateStyle: "long" })}</span>
                </div>
              )}
              {gallery.event_location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  <span>{gallery.event_location}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-indigo-400" />
                <span>{photos.length} Captured Frames</span>
              </div>
            </div>
          </div>
        </section>

        {/* Gallery Controls & Proofing Tabs */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 py-2 border-b border-white/10 pb-4">
          {/* Tabs: All vs Proofing Favorites */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "all" ? themeStyles.pillActive : themeStyles.pillInactive
              }`}
            >
              <span>All Photographs</span>
              <span className="text-[11px] opacity-80 font-mono">({photos.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("favorites")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "favorites" ? "bg-pink-600 text-white shadow-md shadow-pink-600/30" : themeStyles.pillInactive
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${favorites.size > 0 ? "fill-current text-pink-400" : ""}`} />
              <span>Proofing Favorites</span>
              <span className="text-[11px] opacity-80 font-mono">({favorites.size})</span>
            </button>
          </div>

          {/* Search & Layout Toggles */}
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search filename..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3.5 py-1.5 rounded-xl text-xs border border-white/15 bg-black/20 focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium placeholder:text-slate-500 w-full md:w-44"
            />

            {/* Layout Mode Selector */}
            <div className="flex items-center rounded-xl p-1 bg-black/20 border border-white/10 shrink-0">
              <button
                type="button"
                onClick={() => setLayoutMode("dynamic")}
                className={`p-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs ${
                  layoutMode === "dynamic" ? "bg-amber-400 text-slate-950 font-bold shadow-sm" : "text-slate-400 hover:text-white"
                }`}
                title="Dynamic Justified Rows (Natural Aspect Ratios)"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden xl:inline text-[11px]">Dynamic</span>
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode("masonry")}
                className={`p-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs ${
                  layoutMode === "masonry" ? "bg-amber-400 text-slate-950 font-bold shadow-sm" : "text-slate-400 hover:text-white"
                }`}
                title="Staggered Masonry Flow"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden xl:inline text-[11px]">Masonry</span>
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode("balanced")}
                className={`p-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs ${
                  layoutMode === "balanced" ? "bg-amber-400 text-slate-950 font-bold shadow-sm" : "text-slate-400 hover:text-white"
                }`}
                title="Balanced Uniform Grid"
              >
                <Grid3X3 className="w-3.5 h-3.5" />
                <span className="hidden xl:inline text-[11px]">Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode("dense")}
                className={`p-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs ${
                  layoutMode === "dense" ? "bg-amber-400 text-slate-950 font-bold shadow-sm" : "text-slate-400 hover:text-white"
                }`}
                title="Compact Dense View (6 Columns)"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden xl:inline text-[11px]">Dense</span>
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode("narrative")}
                className={`p-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs ${
                  layoutMode === "narrative" ? "bg-amber-400 text-slate-950 font-bold shadow-sm" : "text-slate-400 hover:text-white"
                }`}
                title="Large Story Feed"
              >
                <Columns className="w-3.5 h-3.5" />
                <span className="hidden xl:inline text-[11px]">Story</span>
              </button>
            </div>
          </div>
        </div>

        {/* Gallery Photographs Grid */}
        {filteredPhotos.length === 0 ? (
          <div className="text-center py-24 space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-slate-800/40 text-slate-500 flex items-center justify-center mx-auto border border-white/10">
              <Camera className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold">No photographs found</h3>
            <p className={`text-xs ${themeStyles.subtext} max-w-sm mx-auto`}>
              {activeTab === "favorites"
                ? "You haven't marked any photos as proofing favorites yet. Click the heart icon on any photo to add it to your selection."
                : "No matching photos found for your query."}
            </p>
          </div>
        ) : (
          <div
            className={
              layoutMode === "dynamic"
                ? "flex flex-wrap gap-4 items-stretch"
                : layoutMode === "narrative"
                ? "grid grid-cols-1 md:grid-cols-2 gap-8"
                : layoutMode === "balanced"
                ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
                : layoutMode === "dense"
                ? "grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3"
                : "columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-5 space-y-5"
            }
          >
            {filteredPhotos.map((photo, idx) => {
              const isFav = favorites.has(photo.id);
              const imgUrl = photo.signedUrl || `/media/${photo.storage_path}`;
              const note = photoNotes[photo.id];
              const ratio = aspectRatios[photo.id] || (photo.width && photo.height ? photo.width / photo.height : 1.33);
              const flexGrow = Math.max(0.6, Math.min(2.5, ratio));
              const flexBasis = `${Math.round(flexGrow * 250)}px`;

              return (
                <div
                  key={photo.id}
                  style={
                    layoutMode === "dynamic"
                      ? { flexGrow, flexBasis, flexShrink: 1 }
                      : undefined
                  }
                  className={
                    layoutMode === "dynamic"
                      ? `group relative rounded-2xl overflow-hidden ${themeStyles.card} transition-all duration-300 cursor-pointer min-h-[240px] max-h-[480px] h-[320px] sm:h-[360px]`
                      : `group relative rounded-2xl overflow-hidden ${themeStyles.card} transition-all duration-300 cursor-pointer break-inside-avoid mb-5`
                  }
                  onClick={() => setActivePhotoIdx(idx)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imgUrl}
                    alt={photo.filename}
                    onLoad={(e) => handleImageLoad(photo.id, e.currentTarget)}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    loading="lazy"
                  />

                  {/* Gradient Hover Layer & Controls */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-3.5">
                    {/* Top Action Row */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-white/80 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10">
                        #{idx + 1}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowNoteModalForPhoto(photo);
                            setCurrentNoteText(photoNotes[photo.id] || "");
                          }}
                          className="p-2 rounded-xl bg-black/60 hover:bg-amber-400 hover:text-slate-950 text-white backdrop-blur-md transition-colors"
                          title="Add retouch note"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(photo.id);
                          }}
                          className={`p-2 rounded-xl backdrop-blur-md transition-all ${
                            isFav
                              ? "bg-pink-600 text-white shadow-lg shadow-pink-600/40"
                              : "bg-black/60 text-white hover:bg-pink-600 hover:text-white"
                          }`}
                          title="Mark proofing selection"
                        >
                          <Heart className={`w-3.5 h-3.5 ${isFav ? "fill-current" : ""}`} />
                        </button>
                      </div>
                    </div>

                    {/* Bottom Metadata & Download */}
                    <div className="flex items-center justify-between text-xs text-white">
                      <div className="truncate max-w-[170px]">
                        <span className="font-mono text-[11px] font-semibold block truncate">
                          {photo.filename}
                        </span>
                        {note && (
                          <span className="text-[10px] text-amber-300 font-sans truncate block">
                            Note: {note}
                          </span>
                        )}
                      </div>
                      <a
                        href={imgUrl}
                        download={photo.filename}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 bg-white/20 hover:bg-white/40 text-white rounded-xl backdrop-blur-md transition-colors"
                        title="Download High-Res"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>

                  {/* Persistent Favorite Pill if selected */}
                  {isFav && (
                    <div className="absolute top-2.5 left-2.5 z-10 p-1.5 rounded-full bg-pink-600 text-white shadow-md shadow-pink-600/40 animate-in zoom-in-50">
                      <Heart className="w-3.5 h-3.5 fill-current" />
                    </div>
                  )}
                  {note && !isFav && (
                    <div className="absolute top-2.5 left-2.5 z-10 px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 text-[10px] font-bold shadow-md">
                      Note Added
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Proofing Dock Bar */}
      {favorites.size > 0 && (
        <aside className="fixed bottom-6 inset-x-0 z-40 flex justify-center px-4 animate-in slide-in-from-bottom-6 duration-300 pointer-events-none">
          <div className="pointer-events-auto bg-slate-900/95 border border-amber-500/40 text-white rounded-3xl p-3 sm:px-6 sm:py-3.5 shadow-2xl backdrop-blur-2xl flex flex-wrap items-center justify-between gap-4 max-w-2xl w-full">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-pink-600 text-white flex items-center justify-center shadow-lg shadow-pink-600/40">
                <Heart className="w-4 h-4 fill-current" />
              </div>
              <div>
                <span className="text-xs font-black text-amber-300 tracking-wide uppercase block">
                  Proofing Tray
                </span>
                <span className="text-xs text-slate-300 font-semibold">
                  {favorites.size} photographs selected
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportFavorites}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                title="Export list of selected photo filenames"
              >
                Export List
              </button>
              <button
                type="button"
                onClick={() => setShowProofingSubmitModal(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-black shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit to Studio</span>
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Lightbox / Slideshow Fullscreen Modal */}
      {mounted && activePhotoIdx !== null && photos[activePhotoIdx] && createPortal(
        <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 w-full h-full z-[99999] flex flex-col bg-slate-950/98 backdrop-blur-2xl text-white select-none overflow-hidden animate-in fade-in duration-200">
          {/* Top Control Bar */}
          <div className="shrink-0 flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3 bg-slate-950/95 border-b border-white/10 z-50">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-bold text-amber-400 bg-slate-900/90 px-3 py-1 rounded-xl border border-slate-700">
                {activePhotoIdx + 1} / {photos.length}
              </span>
              <span className="text-xs text-slate-300 font-semibold truncate max-w-[200px] sm:max-w-md">
                {photos[activePhotoIdx].filename}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Slideshow Play/Pause */}
              <button
                type="button"
                onClick={() => setIsPlayingSlideshow(!isPlayingSlideshow)}
                className={`p-2.5 rounded-xl border border-slate-700/80 transition-colors cursor-pointer ${isPlayingSlideshow ? "bg-amber-400 text-slate-950 font-bold" : "bg-slate-900/80 text-white hover:bg-slate-800"}`}
                title={isPlayingSlideshow ? "Pause Slideshow (Space)" : "Play Slideshow (Space)"}
              >
                {isPlayingSlideshow ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              </button>

              {/* Zoom Controls */}
              <button
                type="button"
                onClick={() => setZoomLevel((prev) => (prev === 1 ? 1.6 : prev === 1.6 ? 2.2 : 1))}
                className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700/80 transition-colors cursor-pointer"
                title="Zoom Inspection (+ / -)"
              >
                {zoomLevel > 1 ? <ZoomOut className="w-4 h-4 text-amber-400" /> : <ZoomIn className="w-4 h-4" />}
              </button>

              {/* Toggle Info */}
              <button
                type="button"
                onClick={() => setShowExifInfo(!showExifInfo)}
                className={`p-2.5 rounded-xl border border-slate-700/80 transition-colors cursor-pointer ${showExifInfo ? "bg-amber-400 text-slate-950 font-bold" : "bg-slate-900/80 text-white hover:bg-slate-800"}`}
                title="Photo Details"
              >
                <Info className="w-4 h-4" />
              </button>

              {/* Fullscreen */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700/80 transition-colors cursor-pointer"
                title="Toggle Fullscreen (F)"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              {/* Close */}
              <button
                type="button"
                onClick={() => {
                  setActivePhotoIdx(null);
                  setIsPlayingSlideshow(false);
                }}
                className="p-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer"
                title="Close Lightbox (ESC)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Navigation Arrows & Center Image Stage */}
          <div className="relative flex-1 min-h-0 w-full flex items-center justify-center p-2 sm:p-4 overflow-hidden">
            {activePhotoIdx > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-50 p-3.5 rounded-2xl bg-black/70 hover:bg-black text-white border border-white/20 transition-all active:scale-95 cursor-pointer shadow-2xl"
                title="Previous Photo (←)"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {activePhotoIdx < photos.length - 1 && (
              <button
                type="button"
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-50 p-3.5 rounded-2xl bg-black/70 hover:bg-black text-white border border-white/20 transition-all active:scale-95 cursor-pointer shadow-2xl"
                title="Next Photo (→)"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}

            {/* Main Stage Image */}
            <div className="w-full h-full flex items-center justify-center overflow-hidden transition-transform duration-300">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photos[activePhotoIdx].signedUrl || `/media/${photos[activePhotoIdx].storage_path}`}
                alt={photos[activePhotoIdx].filename}
                style={{ transform: `scale(${zoomLevel})` }}
                className="max-h-full max-w-full object-contain rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.9)] transition-transform duration-300 cursor-zoom-in"
                onClick={() => setZoomLevel((z) => (z === 1 ? 1.8 : 1))}
              />
            </div>
          </div>

          {/* Bottom Action Footer */}
          <div className="shrink-0 px-3 py-2.5 sm:px-4 sm:py-3 bg-slate-950/95 border-t border-white/15 flex flex-wrap items-center justify-between gap-2.5 z-50">
            <div className="flex items-center gap-2">
              {/* Favorite Toggle Button */}
              <button
                type="button"
                onClick={() => toggleFavorite(photos[activePhotoIdx].id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  favorites.has(photos[activePhotoIdx].id)
                    ? "bg-pink-600 text-white shadow-lg shadow-pink-600/50"
                    : "bg-slate-900/80 hover:bg-pink-600 text-slate-200 border border-slate-700"
                }`}
              >
                <Heart className={`w-4 h-4 ${favorites.has(photos[activePhotoIdx].id) ? "fill-current" : ""}`} />
                <span>{favorites.has(photos[activePhotoIdx].id) ? "Proof Selected" : "Add to Proofing"}</span>
              </button>

              {/* Note Button */}
              <button
                type="button"
                onClick={() => {
                  setShowNoteModalForPhoto(photos[activePhotoIdx]);
                  setCurrentNoteText(photoNotes[photos[activePhotoIdx].id] || "");
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                <span>{photoNotes[photos[activePhotoIdx].id] ? "Edit Retouch Note" : "Add Note"}</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <a
                href={photos[activePhotoIdx].signedUrl || `/media/${photos[activePhotoIdx].storage_path}`}
                download={photos[activePhotoIdx].filename}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 text-xs font-black flex items-center gap-2 shadow-lg hover:from-amber-300 hover:to-amber-400 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Download Original</span>
              </a>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Share Modal */}
      {mounted && showShareModal && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-7 max-w-md w-full text-white shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Share Gallery</h3>
                  <span className="text-[11px] text-slate-400">Send direct proofing access</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Gallery Link
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={typeof window !== "undefined" ? window.location.href.split("/").slice(0, -1).join("/") : ""}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 font-semibold focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyShare}
                  className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>

            {/* Quick Share Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Here is the client gallery link for ${gallery.title}: ${typeof window !== "undefined" ? window.location.href.split("/").slice(0, -1).join("/") : ""}`)}`}
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-xl bg-[#25D366]/20 border border-[#25D366]/40 hover:bg-[#25D366]/30 text-[#25D366] text-xs font-bold flex items-center justify-center gap-2 transition-colors text-center"
              >
                <span>Share via WhatsApp</span>
              </a>
              <a
                href={`mailto:?subject=${encodeURIComponent(`Client Gallery: ${gallery.title}`)}&body=${encodeURIComponent(`View your high-resolution collection here:\n${typeof window !== "undefined" ? window.location.href.split("/").slice(0, -1).join("/") : ""}`)}`}
                className="p-3 rounded-xl bg-indigo-600/20 border border-indigo-500/40 hover:bg-indigo-600/30 text-indigo-300 text-xs font-bold flex items-center justify-center gap-2 transition-colors text-center"
              >
                <span>Share via Email</span>
              </a>
            </div>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Retouch Note Modal */}
      {mounted && showNoteModalForPhoto && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 max-w-md w-full text-white shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold">Retouch Request & Notes</h3>
                <span className="text-[11px] font-mono text-slate-400">{showNoteModalForPhoto.filename}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowNoteModalForPhoto(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <textarea
              rows={4}
              value={currentNoteText}
              onChange={(e) => setCurrentNoteText(e.target.value)}
              placeholder="e.g. Please crop closer, remove the background shadow, or deliver in black & white."
              className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium"
            />

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowNoteModalForPhoto(null)}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (showNoteModalForPhoto) {
                    setPhotoNotes((prev) => ({
                      ...prev,
                      [showNoteModalForPhoto.id]: currentNoteText.trim(),
                    }));
                    // Automatically add to favorites if note is added
                    if (currentNoteText.trim()) {
                      toggleFavorite(showNoteModalForPhoto.id);
                    }
                  }
                  setShowNoteModalForPhoto(null);
                }}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black rounded-xl transition-all"
              >
                Save Request
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Proofing Selections Submit Modal */}
      {mounted && showProofingSubmitModal && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 max-w-lg w-full text-white shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-300 flex items-center justify-center">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Submit Selections to Studio</h3>
                  <span className="text-[11px] text-slate-400">Send chosen proofs for album & retouching</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowProofingSubmitModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {clientSubmissionSuccess ? (
              <div className="p-6 rounded-2xl bg-emerald-950/60 border border-emerald-700/60 text-emerald-200 text-center space-y-2">
                <Check className="w-8 h-8 mx-auto text-emerald-400" />
                <h4 className="text-base font-bold">Selections Submitted Successfully!</h4>
                <p className="text-xs text-emerald-300">
                  {gallery.studio_name || "The Studio"} has received your {favorites.size} selected photos and notes.
                </p>
              </div>
            ) : (
              <form onSubmit={handleProofingSubmit} className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
                  <span>Selected Photos for Proofing:</span>
                  <span className="font-mono font-bold text-amber-400 text-sm">{favorites.size} Photos</span>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Your Name / Client Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Client Email / Phone *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. client@example.com or +1 234 567 890"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Additional Instructions for Photographer
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Any special requests or details regarding final prints or editing style..."
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowProofingSubmitModal(false)}
                    className="px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-black rounded-xl shadow-lg transition-all"
                  >
                    Submit Proofing Final List
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Footer */}
      <footer className={`border-t border-white/10 py-8 text-center text-xs ${themeStyles.subtext} space-y-1`}>
        <p>&copy; {new Date().getFullYear()} {gallery.studio_name || "TrizenAI Studio"} &bull; Protected Proofing Platform</p>
        <p className="text-[10px] opacity-70">Curated & delivered in ultra high definition</p>
      </footer>
    </div>
  );
}
