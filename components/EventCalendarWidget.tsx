"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  X,
  Maximize2,
  Minimize2,
  Clock,
  MapPin,
  Camera,
  Layers,
  BarChart3,
  TrendingUp,
  ShieldCheck,
  Sparkles,
  Users,
  Image as ImageIcon,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import type { Event } from "@/types/database";

interface EventCalendarWidgetProps {
  events: Event[];
  isAdmin?: boolean;
}

export function EventCalendarWidget({ events = [], isAdmin = true }: EventCalendarWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"calendar" | "analysis">("calendar");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  // Group events by date (YYYY-MM-DD)
  const eventsByDate = useMemo(() => {
    const map: Record<string, Event[]> = {};
    events.forEach((ev) => {
      if (!ev.event_date) return;
      const d = ev.event_date.split("T")[0];
      if (!map[d]) map[d] = [];
      map[d].push(ev);
    });
    return map;
  }, [events]);

  // Production Metrics Calculation
  const metrics = useMemo(() => {
    const totalEvents = events.length;
    const totalPhotos = events.reduce((sum, e) => sum + (e.photos_count || 0), 0);
    const publishedGalleries = events.filter((e) => e.gallery_status === "PUBLISHED").length;
    const draftGalleries = events.filter((e) => e.gallery_status === "DRAFT").length;
    const activeShoots = events.filter((e) => e.gallery_status === "NONE").length;

    // Category breakdown
    const catMap: Record<string, number> = {};
    events.forEach((e) => {
      const cat = e.category || "General";
      catMap[cat] = (catMap[cat] || 0) + 1;
    });

    const categories = Object.entries(catMap)
      .map(([name, count]) => ({
        name,
        count,
        percentage: totalEvents > 0 ? Math.round((count / totalEvents) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Upcoming in next 7 days
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);

    const upcoming7Days = events.filter((e) => {
      if (!e.event_date) return false;
      const d = new Date(e.event_date);
      return d >= now && d <= nextWeek;
    }).length;

    return {
      totalEvents,
      totalPhotos,
      publishedGalleries,
      draftGalleries,
      activeShoots,
      categories,
      upcoming7Days,
    };
  }, [events]);

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthName = currentDate.toLocaleString("default", { month: "long" });

  const monthEventsCount = useMemo(() => {
    return events.filter((e) => {
      if (!e.event_date) return false;
      const d = new Date(e.event_date);
      return d.getFullYear() === year && d.getMonth() === month;
    }).length;
  }, [events, year, month]);

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }

  function formatDayKey(day: number) {
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${year}-${mm}-${dd}`;
  }

  const selectedDayEvents = selectedDateStr ? eventsByDate[selectedDateStr] || [] : [];

  return (
    <aside aria-label="Event Schedule and Production Telemetry" className="fixed bottom-6 right-6 z-40 select-none">
      {/* Collapsed Pill Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl shadow-xl shadow-slate-900/20 border border-slate-700/80 transition-all hover:scale-105 active:scale-95"
        >
          <div className="relative">
            <CalendarIcon className="w-4 h-4 text-indigo-400 group-hover:rotate-6 transition-transform" />
            {events.length > 0 && (
              <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </div>
          <div className="flex items-center gap-2 text-xs font-bold">
            <span>Schedule & Telemetry</span>
            <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-mono border border-indigo-500/30">
              {events.length} Events
            </span>
          </div>
        </button>
      )}

      {/* Expanded Floating Panel */}
      {isOpen && (
        <div className="w-[360px] sm:w-[420px] bg-white border border-slate-200/90 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[82vh] animate-in fade-in-50 zoom-in-95 duration-200">
          {/* Header Bar */}
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 flex items-center justify-center">
                <CalendarIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold tracking-tight leading-tight">Studio Calendar & Production</h3>
                <span className="text-[10px] text-slate-400 font-medium">
                  {events.length} total photoshoots logged
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Tab Toggles */}
              <div className="flex bg-slate-800/80 p-0.5 rounded-xl text-[11px] font-semibold border border-slate-700/60">
                <button
                  type="button"
                  onClick={() => setActiveTab("calendar")}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    activeTab === "calendar" ? "bg-indigo-600 text-white shadow-2xs font-bold" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Calendar
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("analysis")}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    activeTab === "analysis" ? "bg-indigo-600 text-white shadow-2xs font-bold" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Production Analysis
                </button>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors ml-1"
                title="Minimize Widget"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Metrics Ticker */}
          <div className="grid grid-cols-3 bg-slate-50 border-b border-slate-200/80 divide-x divide-slate-200/80 text-center py-2.5 text-xs">
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Shoots</span>
              <span className="font-bold text-slate-900 font-mono text-sm">{metrics.totalEvents}</span>
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Next 7 Days</span>
              <span className="font-bold text-indigo-600 font-mono text-sm">{metrics.upcoming7Days}</span>
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">This Month</span>
              <span className="font-bold text-emerald-600 font-mono text-sm">{monthEventsCount}</span>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-4 overflow-y-auto flex-1 space-y-4">
            {activeTab === "calendar" ? (
              <>
                {/* Month Navigation */}
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    {monthName} {year}
                  </h4>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={prevMonth}
                      className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                      title="Previous Month"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setCurrentDate(new Date())}
                      className="px-2 py-1 text-[10px] font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                    >
                      Today
                    </button>
                    <button
                      onClick={nextMonth}
                      className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                      title="Next Month"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Weekday Headers */}
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                    <div key={d} className="py-1">
                      {d}
                    </div>
                  ))}
                </div>

                {/* Month Days Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {/* Empty cells before 1st of month */}
                  {Array.from({ length: firstDayIndex }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-9 rounded-xl bg-transparent" />
                  ))}

                  {/* Day cells */}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const dateKey = formatDayKey(day);
                    const dayEvents = eventsByDate[dateKey] || [];
                    const hasEvents = dayEvents.length > 0;
                    const isSelected = selectedDateStr === dateKey;

                    const isToday =
                      new Date().getDate() === day &&
                      new Date().getMonth() === month &&
                      new Date().getFullYear() === year;

                    return (
                      <button
                        type="button"
                        key={day}
                        onClick={() => setSelectedDateStr(isSelected ? null : dateKey)}
                        className={`h-9 rounded-xl text-xs font-semibold relative flex flex-col items-center justify-center transition-all ${
                          isSelected
                            ? "bg-slate-900 text-white font-bold ring-2 ring-indigo-500 shadow-xs"
                            : hasEvents
                            ? "bg-indigo-50/90 text-indigo-950 font-bold border border-indigo-200/80 hover:bg-indigo-100"
                            : isToday
                            ? "bg-slate-100 text-slate-900 border border-slate-300 font-bold"
                            : "text-slate-700 hover:bg-slate-100/80"
                        }`}
                      >
                        <span>{day}</span>
                        {hasEvents && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                              isSelected ? "bg-indigo-400" : "bg-indigo-600"
                            }`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Selected Day Event Drawer */}
                {selectedDateStr && (
                  <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-2.5 animate-in fade-in-50 duration-150">
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                        <CalendarIcon className="w-3.5 h-3.5 text-indigo-600" />
                        <span>
                          {new Date(selectedDateStr).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-slate-200/70 text-slate-700">
                        {selectedDayEvents.length} {selectedDayEvents.length === 1 ? "shoot" : "shoots"}
                      </span>
                    </div>

                    {selectedDayEvents.length === 0 ? (
                      <p className="text-[11px] text-slate-400 text-center py-2">
                        No photoshoots scheduled on this date.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {selectedDayEvents.map((ev) => (
                          <div
                            key={ev.id}
                            className="p-2.5 bg-white border border-slate-200 rounded-xl space-y-1.5 hover:border-indigo-300 transition-all shadow-2xs"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <Link
                                href={`/events/${ev.id}`}
                                className="text-xs font-bold text-slate-900 hover:text-indigo-600 transition-colors line-clamp-1"
                              >
                                {ev.name}
                              </Link>
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 shrink-0">
                                {ev.category || "General"}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-slate-500">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                {ev.start_time || "All day"}
                              </span>
                              {ev.location && (
                                <span className="flex items-center gap-1 truncate max-w-[130px]">
                                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span className="truncate">{ev.location}</span>
                                </span>
                              )}
                              <span className="font-medium text-slate-600">{ev.photos_count || 0} photos</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              /* Production Detail Analysis Tab */
              <div className="space-y-4">
                {/* Shoot Delivery Funnel */}
                <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                      Client Proofing Status
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold">100% Ingest Rate</span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-[11px] font-semibold mb-1">
                        <span className="text-emerald-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Published PIN Galleries
                        </span>
                        <span className="text-slate-900 font-mono">{metrics.publishedGalleries} / {metrics.totalEvents}</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${metrics.totalEvents > 0 ? (metrics.publishedGalleries / metrics.totalEvents) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] font-semibold mb-1">
                        <span className="text-amber-800">Draft Proofing PINs</span>
                        <span className="text-slate-900 font-mono">{metrics.draftGalleries}</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-amber-500 h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${metrics.totalEvents > 0 ? (metrics.draftGalleries / metrics.totalEvents) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Category Breakdown */}
                <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
                      Photoshoot Categories
                    </span>
                    <span className="text-[10px] text-slate-500">{metrics.categories.length} styles</span>
                  </div>

                  {metrics.categories.length === 0 ? (
                    <p className="text-[11px] text-slate-400 text-center py-2">No category data yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {metrics.categories.slice(0, 5).map((cat) => (
                        <div key={cat.name} className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="font-semibold text-slate-800 truncate">{cat.name}</span>
                            <span className="text-slate-500 font-mono text-[10px]">
                              {cat.count} shoots ({cat.percentage}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-slate-900 h-full rounded-full transition-all duration-500"
                              style={{ width: `${cat.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* High-Res Media Metrics */}
                <div className="p-3.5 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-indigo-950">Cloud Photo Assets</div>
                      <div className="text-[10px] text-indigo-700">Stored across Supabase buckets</div>
                    </div>
                  </div>
                  <span className="text-base font-bold text-indigo-950 font-mono">
                    {metrics.totalPhotos}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Action Footer */}
          {isAdmin && (
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
              <Link
                href="/events/new"
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Create New Photoshoot</span>
              </Link>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
