"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Calendar,
  Image as ImageIcon,
  MapPin,
  Sparkles,
  ExternalLink,
  ChevronRight,
  PlusCircle,
  X,
  Clock,
  Tag,
} from "lucide-react";

interface SearchEventResult {
  id: number;
  name: string;
  slug: string;
  category: string;
  eventDate?: string;
  location?: string;
  clientName?: string;
  photosCount: number;
  gallerySlug?: string;
  isPublished?: boolean;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Wedding: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  Engagement: { bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-200" },
  Birthday: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  Corporate: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  Portrait: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  Commercial: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
  RealEstate: { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
  Family: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
};

export function NavSearchAutocomplete() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchEventResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search query
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(`/api/events/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.events || []);
          setSelectedIndex(-1);
        }
      } catch (err) {
        console.error("Search fetch error:", err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [query]);

  // Handle outside clicks to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Global Ctrl+K / Cmd+K hotkey to focus search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen || results.length === 0) {
      if (e.key === "Enter" && query.trim()) {
        router.push(`/events?q=${encodeURIComponent(query.trim())}`);
        setIsOpen(false);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        const selected = results[selectedIndex];
        router.push(`/events/${selected.id}`);
        setIsOpen(false);
      } else if (query.trim()) {
        router.push(`/events?q=${encodeURIComponent(query.trim())}`);
        setIsOpen(false);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  }

  function highlightMatch(text: string, match: string) {
    if (!match.trim()) return text;
    const parts = text.split(new RegExp(`(${match})`, "gi"));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === match.toLowerCase() ? (
            <mark key={i} className="bg-indigo-100 text-indigo-900 font-bold px-0.5 rounded">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-xs sm:max-w-sm lg:max-w-md">
      {/* Search Input Box */}
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search events, clients, categories..."
          className="w-full pl-9 pr-14 py-1.5 bg-slate-100/90 hover:bg-slate-100 focus:bg-white border border-slate-200/90 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all shadow-2xs font-medium"
        />
        <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />

        <div className="absolute right-2.5 flex items-center gap-1">
          {loading ? (
            <span className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          ) : query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setResults([]);
                inputRef.current?.focus();
              }}
              className="p-0.5 text-slate-400 hover:text-slate-600 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-bold text-slate-400 bg-white border border-slate-200 rounded shadow-2xs">
              ⌘K
            </kbd>
          )}
        </div>
      </div>

      {/* Autocomplete Dropdown Panel */}
      {isOpen && query.trim().length >= 2 && (
        <div className="absolute top-full left-0 mt-1.5 w-full sm:min-w-[380px] bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in-50 slide-in-from-top-1 duration-150">
          <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <span>Matching Events ({results.length})</span>
            <span className="font-normal text-slate-400">↑↓ to navigate • ↵ to open</span>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
            {results.length === 0 && !loading ? (
              <div className="p-6 text-center space-y-2">
                <p className="text-xs text-slate-600 font-semibold">
                  No photoshoots found matching &ldquo;{query}&rdquo;
                </p>
                <p className="text-[11px] text-slate-400">
                  Try searching by shoot name, client contact, or venue.
                </p>
                <div className="pt-2">
                  <Link
                    href="/events/new"
                    onClick={() => setIsOpen(false)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Create This Shoot</span>
                  </Link>
                </div>
              </div>
            ) : (
              results.map((event, idx) => {
                const isSelected = selectedIndex === idx;
                const catStyle = CATEGORY_COLORS[event.category] || {
                  bg: "bg-slate-100",
                  text: "text-slate-700",
                  border: "border-slate-200",
                };

                return (
                  <div
                    key={event.id}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    onClick={() => {
                      router.push(`/events/${event.id}`);
                      setIsOpen(false);
                    }}
                    className={`p-3 cursor-pointer transition-colors flex items-center justify-between gap-3 ${
                      isSelected ? "bg-indigo-50/70" : "hover:bg-slate-50/80"
                    }`}
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 truncate block">
                          {highlightMatch(event.name, query)}
                        </span>
                        <span
                          className={`px-2 py-0.2 rounded-full text-[9px] font-bold uppercase tracking-wider border shrink-0 ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
                        >
                          {event.category}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-slate-500 truncate">
                        {event.eventDate && (
                          <span className="flex items-center gap-1 shrink-0">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {new Date(event.eventDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        )}
                        {event.location && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1 truncate">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{highlightMatch(event.location, query)}</span>
                            </span>
                          </>
                        )}
                        <span>•</span>
                        <span className="shrink-0">{event.photosCount} photos</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Link
                        href={`/events/${event.id}/photos`}
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg border border-slate-200/60 shadow-2xs"
                        title="Manage Photos"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                      </Link>
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <Link
              href={`/events?q=${encodeURIComponent(query.trim())}`}
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <span>View all matching results</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
