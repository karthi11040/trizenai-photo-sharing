"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PlusCircle,
  Search,
  Camera,
  Calendar,
  MapPin,
  Clock,
  ExternalLink,
  MoreVertical,
  Edit,
  Users,
  ImageIcon,
  Trash2,
  Share2,
  ArrowRight,
  Filter,
  CheckCircle2,
  Sparkles,
  SlidersHorizontal,
  X,
  AlertCircle,
} from "lucide-react";
import { deleteEventAction } from "@/app/actions/events";
import { EventStatusBadge } from "@/components/events/EventStatusBadge";

export interface EventItem {
  id: number;
  name: string;
  slug: string;
  category?: string | null;
  client_name?: string | null;
  client_email?: string | null;
  client_phone?: string | null;
  description?: string | null;
  event_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  location?: string | null;
  venue_address?: string | null;
  cover_image?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  photos_count?: number;
  members_count?: number;
  gallery_id?: number | null;
  gallery_slug?: string | null;
  gallery_is_published?: boolean | null;
  gallery_status?: "PUBLISHED" | "DRAFT" | "NONE";
  status?: "ACTIVE" | "UPCOMING" | "COMPLETED" | "DRAFT";
}

interface EventsClientPageProps {
  events: EventItem[];
  isAdmin: boolean;
}

export function EventsClientPage({ events: initialEvents, isAdmin }: EventsClientPageProps) {
  const router = useRouter();
  const [eventsList, setEventsList] = useState<EventItem[]>(initialEvents);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"ALL" | "UPCOMING" | "STARTED" | "ONGOING" | "COMPLETED" | "QUIT">("ALL");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "updated">("newest");
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteConfirmEvent, setDeleteConfirmEvent] = useState<EventItem | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close overflow dropdown menu when clicking outside & keyboard shortcut (Cmd+K / Ctrl+K / '/')
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Compute status if missing
  const enrichedEvents = useMemo(() => {
    return eventsList.map((e) => {
      const status = e.status || "UPCOMING";
      return {
        ...e,
        computedStatus: status,
      };
    });
  }, [eventsList]);

  // Filtered & Sorted events
  const filteredEvents = useMemo(() => {
    let list = [...enrichedEvents];

    // Category / Status Filter
    if (activeFilter !== "ALL") {
      list = list.filter((e) => (e.status || e.computedStatus || "UPCOMING").toUpperCase() === activeFilter);
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (e) =>
          (e.name || "").toLowerCase().includes(q) ||
          (e.category || "").toLowerCase().includes(q) ||
          (e.client_name || "").toLowerCase().includes(q) ||
          (e.client_email || "").toLowerCase().includes(q) ||
          (e.client_phone || "").toLowerCase().includes(q) ||
          (e.location || "").toLowerCase().includes(q) ||
          (e.description || "").toLowerCase().includes(q) ||
          (e.slug || "").toLowerCase().includes(q) ||
          (e.gallery_slug || "").toLowerCase().includes(q)
      );
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === "oldest") {
        const dateA = a.event_date ? new Date(a.event_date).getTime() : 0;
        const dateB = b.event_date ? new Date(b.event_date).getTime() : 0;
        return dateA - dateB;
      } else if (sortBy === "updated") {
        const dateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const dateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return dateB - dateA;
      } else {
        // default newest
        const dateA = a.event_date ? new Date(a.event_date).getTime() : 0;
        const dateB = b.event_date ? new Date(b.event_date).getTime() : 0;
        return dateB - dateA;
      }
    });

    return list;
  }, [enrichedEvents, activeFilter, searchQuery, sortBy]);

  const featuredEvent = filteredEvents[0];
  const regularEvents = filteredEvents.slice(1);

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmEvent) return;
    setDeletingLoading(true);
    const res = await deleteEventAction(deleteConfirmEvent.id);
    setDeletingLoading(false);
    if (res.success) {
      setEventsList((prev) => prev.filter((item) => item.id !== deleteConfirmEvent.id));
      setDeleteConfirmEvent(null);
      setActiveMenuId(null);
    } else {
      alert(res.error || "Failed to delete project");
    }
  };

  return (
    <div className="space-y-8 pb-16 selection:bg-slate-900 selection:text-white">
      {/* 1. TOP BANNER (SETTINGS DESIGN & STUDIO ACCENT) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-[var(--studio-font-family,inherit)]">
              Photoshoot Events
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-200">
              {eventsList.length} Total
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-[var(--studio-font-family,inherit)]">
            Manage photoshoot events, live shoot statuses, assigned photography team members, and PIN client galleries.
          </p>
        </div>

        {isAdmin && (
          <Link
            href="/events/new"
            className="px-4 py-2.5 bg-[var(--studio-accent,#0f172a)] hover:bg-[var(--studio-accent-hover,#1e293b)] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Shoot</span>
          </Link>
        )}
      </div>

      {/* 2. SEARCH & FILTER TOOLBAR */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-xs">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 px-1">
          {(["ALL", "UPCOMING", "STARTED", "ONGOING", "COMPLETED", "QUIT"] as const).map((filterKey) => {
            const count =
              filterKey === "ALL"
                ? enrichedEvents.length
                : enrichedEvents.filter((e) => (e.status || e.computedStatus || "UPCOMING").toUpperCase() === filterKey).length;

            const isActive = activeFilter === filterKey;

            const labels: Record<string, string> = {
              ALL: "All Shoots",
              UPCOMING: "Upcoming",
              STARTED: "Started",
              ONGOING: "Live Shoot",
              COMPLETED: "Completed",
              QUIT: "Quit / Cancelled",
            };

            return (
              <button
                key={filterKey}
                type="button"
                onClick={() => setActiveFilter(filterKey)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? "bg-[var(--studio-accent,#0f172a)] text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span>{labels[filterKey]}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                    isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Search Box & Sort Selector */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 px-1">
          {/* Integrated Search Field */}
          <div className="relative w-full sm:w-72 lg:w-96 group">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-slate-900 transition-colors" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by name, client, category, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-20 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 focus:border-slate-900 rounded-xl text-xs font-medium text-slate-900 focus:outline-none transition-all placeholder:text-slate-400 shadow-2xs"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {searchQuery ? (
                <>
                  <span className="px-1.5 py-0.5 text-[9px] font-extrabold bg-slate-900 text-white rounded-md uppercase tracking-wider">
                    {filteredEvents.length} {filteredEvents.length === 1 ? "match" : "matches"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="p-0.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-200/60 transition-colors cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-400 bg-white rounded border border-slate-200 shadow-2xs">
                  ⌘K
                </kbd>
              )}
            </div>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 shrink-0 hidden sm:block" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full sm:w-auto bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:border-slate-900 cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="updated">Recently Updated</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. CONTENT AREA */}
      {filteredEvents.length === 0 ? (
        // NO RESULTS / EMPTY STATE
        searchQuery || activeFilter !== "ALL" ? (
          <div className="bg-white p-16 text-center rounded-3xl border border-slate-200/80 shadow-xs space-y-4 max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto border border-slate-200">
              <Search className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">No events found</h3>
              <p className="text-xs text-slate-500">
                No photography projects match your current search criteria or filter status.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setActiveFilter("ALL");
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="bg-white p-16 text-center rounded-3xl border border-slate-200/80 shadow-xs space-y-4 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto border border-indigo-100">
              <Camera className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-900 tracking-tight font-serif">No shoots yet</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Create your first photography project to start organizing your team&apos;s work, uploading high-res assets, and generating PIN client galleries.
              </p>
            </div>
            {isAdmin && (
              <Link
                href="/events/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create New Photoshoot</span>
              </Link>
            )}
          </div>
        )
      ) : (
        <div className="space-y-6">
          {/* VERTICAL EDITORIAL GRID FOR ALL EVENTS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => (
              <div
                key={event.id}
                className="group bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-lg hover:border-slate-300 transition-all duration-300 flex flex-col justify-between overflow-hidden"
              >
                {/* Vertical Cover Image (Top) */}
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-950">
                  {event.cover_image ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={event.cover_image}
                        alt={event.name}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/15 to-transparent group-hover:opacity-90 transition-opacity duration-300" />
                    </>
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 flex items-center justify-center text-slate-700">
                      <Camera className="w-10 h-10 opacity-30" />
                    </div>
                  )}

                  {/* Status Badges Overlay */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                    <EventStatusBadge event={event} showMediaStatus={true} size="sm" />

                    {event.gallery_slug && (
                      <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-white/90 backdrop-blur-md text-slate-900 shadow-xs flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>{event.gallery_is_published ? "Published" : "Draft"}</span>
                      </span>
                    )}
                  </div>

                  {/* Centered Hover Action Button */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-slate-950/40 backdrop-blur-xs">
                    <Link
                      href={`/events/${event.slug || event.id}`}
                      className="px-4 py-2 bg-white text-slate-900 font-extrabold text-xs rounded-full shadow-md flex items-center gap-1.5 transform translate-y-1 group-hover:translate-y-0 transition-all duration-300 uppercase tracking-wider hover:bg-slate-100"
                    >
                      <span>View Project</span>
                      <ArrowRight className="w-3.5 h-3.5 text-indigo-600" />
                    </Link>
                  </div>
                </div>

                {/* Information Area (Bottom Vertical Content) */}
                <div className="p-4 sm:p-5 flex flex-col justify-between flex-1 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 font-extrabold">
                        {event.category || "Photoshoot"}
                      </span>
                      {event.event_date && (
                        <span>
                          {new Date(event.event_date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 font-serif leading-snug group-hover:text-indigo-600 transition-colors line-clamp-1">
                      <Link href={`/events/${event.slug || event.id}`}>{event.name}</Link>
                    </h3>

                    {event.location && (
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 font-medium truncate">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{event.location}</span>
                      </p>
                    )}
                  </div>

                  {/* Compact Metadata Row & Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                    <div className="flex items-center gap-3 font-semibold text-[11px]">
                      <span className="flex items-center gap-1">
                        <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                        {event.photos_count || 0}
                      </span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-purple-600" />
                        {event.members_count || 0}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/events/${event.slug || event.id}`}
                        className="px-3.5 py-1.5 bg-[var(--studio-accent,#0f172a)] hover:bg-[var(--studio-accent-hover,#1e293b)] text-white font-extrabold text-[11px] rounded-xl transition-all uppercase tracking-wider flex items-center gap-1"
                      >
                        <span>View</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>

                      {/* Card Options Dropdown */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === event.id ? null : event.id);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Options"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {activeMenuId === event.id && (
                          <div
                            ref={menuRef}
                            className="absolute right-0 bottom-full mb-2 w-44 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150"
                          >
                            <Link
                              href={`/events/${event.id}/photos`}
                              className="flex items-center gap-2 px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium"
                            >
                              <ImageIcon className="w-4 h-4 text-indigo-600" />
                              <span>Manage Photos</span>
                            </Link>
                            {event.gallery_slug && (
                              <Link
                                href={`/gallery/${event.gallery_slug}`}
                                target="_blank"
                                className="flex items-center gap-2 px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium"
                              >
                                <ExternalLink className="w-4 h-4 text-slate-500" />
                                <span>Manage Gallery</span>
                              </Link>
                            )}
                            <Link
                              href={`/events/${event.id}`}
                              className="flex items-center gap-2 px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium"
                            >
                              <Users className="w-4 h-4 text-purple-600" />
                              <span>Manage Team</span>
                            </Link>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmEvent(event)}
                                className="w-full text-left flex items-center gap-2 px-3.5 py-2 text-xs text-red-600 hover:bg-red-50 font-medium border-t border-slate-100 mt-1 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>Delete Event</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmEvent && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-slate-200/90 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-100">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Delete Photoshoot?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Are you sure you want to delete &ldquo;<span className="font-semibold text-slate-800">{deleteConfirmEvent.name}</span>&rdquo;? All uploaded photos and client gallery settings will be permanently removed.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                disabled={deletingLoading}
                onClick={() => setDeleteConfirmEvent(null)}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingLoading}
                onClick={handleDeleteConfirm}
                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {deletingLoading ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
