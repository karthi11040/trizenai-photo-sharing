"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Camera,
  ArrowUpRight,
  PlusCircle,
  X,
  Building2,
  Image as ImageIcon,
} from "lucide-react";
import type { Event } from "@/types/database";

interface AppleCalendarCardProps {
  events: Event[];
  isAdmin?: boolean;
}

function normalizeDateKey(dateStr: string | undefined): string {
  if (!dateStr) return "";
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function AppleCalendarCard({ events = [], isAdmin = true }: AppleCalendarCardProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthShort = currentDate.toLocaleString("default", { month: "short" }).toUpperCase();
  const monthName = currentDate.toLocaleString("default", { month: "long" });

  // Map events by normalized date key (YYYY-MM-DD)
  const eventsByDate = useMemo(() => {
    const map: Record<string, Event[]> = {};
    events.forEach((ev) => {
      const key = normalizeDateKey(ev.event_date);
      if (!key) return;
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    });
    return map;
  }, [events]);

  const totalEventsInMonth = useMemo(() => {
    const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}-`;
    return events.filter((e) => {
      const key = normalizeDateKey(e.event_date);
      return key.startsWith(monthPrefix);
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

  // Active events list to display under the calendar
  const activeEventsList = useMemo(() => {
    if (selectedDateKey) {
      return eventsByDate[selectedDateKey] || [];
    }
    // Show events for current month if no single date is selected
    const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}-`;
    const thisMonthEvents = events.filter((e) => {
      const key = normalizeDateKey(e.event_date);
      return key.startsWith(monthPrefix);
    });
    return thisMonthEvents.length > 0 ? thisMonthEvents : events.slice(0, 4);
  }, [selectedDateKey, eventsByDate, events, year, month]);

  const todayDate = new Date();
  const todayDay = todayDate.getDate();
  const isCurrentMonth = todayDate.getFullYear() === year && todayDate.getMonth() === month;

  // Real days in the month that have events
  const eventDays = useMemo(() => {
    const set = new Set<number>();
    const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}-`;
    events.forEach((e) => {
      const key = normalizeDateKey(e.event_date);
      if (key && key.startsWith(monthPrefix)) {
        const parts = key.split("-");
        const dayNum = parseInt(parts[2], 10);
        if (!isNaN(dayNum)) {
          set.add(dayNum);
        }
      }
    });
    return set;
  }, [events, year, month]);

  const formattedSelectedDate = useMemo(() => {
    if (!selectedDateKey) return null;
    const parts = selectedDateKey.split("-");
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, [selectedDateKey]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col select-none">
      {/* Apple-styled Top Header Bar */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Circular Month Pill */}
          <div className="w-8 h-8 rounded-full bg-rose-500/10 text-rose-600 font-extrabold text-[10px] flex items-center justify-center shrink-0 border border-rose-200">
            {monthShort}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                {monthName} {year}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                {totalEventsInMonth} {totalEventsInMonth === 1 ? "Shoot" : "Shoots"}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Production schedule</p>
          </div>
        </div>

        {/* Month Navigation Controls */}
        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200/80 shadow-2xs">
          <button
            type="button"
            onClick={prevMonth}
            className="p-1 text-slate-400 hover:text-slate-900 hover:bg-white rounded-lg transition-colors cursor-pointer"
            title="Previous Month"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setCurrentDate(new Date());
              setSelectedDateKey(null);
            }}
            className="px-2 py-0.5 text-[10px] font-bold text-slate-700 hover:text-slate-900 hover:bg-white rounded-lg transition-colors cursor-pointer"
          >
            Today
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="p-1 text-slate-400 hover:text-slate-900 hover:bg-white rounded-lg transition-colors cursor-pointer"
            title="Next Month"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Calendar Grid View (Apple Design) */}
      <div className="p-5 border-b border-slate-100 space-y-2">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Month day cells */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells before start of month */}
          {Array.from({ length: firstDayIndex }).map((_, i) => (
            <div key={`empty-${i}`} className="h-8 rounded-full bg-transparent" />
          ))}

          {/* Month Days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateKey = formatDayKey(day);
            const isSelected = selectedDateKey === dateKey;
            const isToday = isCurrentMonth && todayDay === day;
            const hasMarker = eventDays.has(day);

            return (
              <button
                type="button"
                key={day}
                onClick={() => setSelectedDateKey(isSelected ? null : dateKey)}
                className={`h-8 w-8 mx-auto rounded-full text-xs font-semibold relative flex flex-col items-center justify-center transition-all cursor-pointer ${
                  isSelected
                    ? "bg-slate-950 text-white font-bold shadow-xs scale-105"
                    : isToday
                    ? "bg-studio-accent text-white font-black shadow-xs ring-2 ring-studio-accent/30"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
                title={`${dateKey}${hasMarker ? " (Has Shoots)" : ""}`}
              >
                <span>{day}</span>
                {hasMarker && !isSelected && (
                  <span
                    className={`w-1 h-1 rounded-full absolute bottom-0.5 ${
                      isToday ? "bg-white" : "bg-rose-500"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Half: Events for Selected Date or Upcoming */}
      <div className="p-5 space-y-3 bg-slate-50/50">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
            {selectedDateKey ? formattedSelectedDate : "Shoots in " + monthName}
          </div>

          {selectedDateKey && (
            <button
              type="button"
              onClick={() => setSelectedDateKey(null)}
              className="text-[10px] font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3 h-3" />
              <span>Show all</span>
            </button>
          )}
        </div>

        {activeEventsList.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 bg-white border border-slate-200/80 rounded-2xl space-y-2">
            <p>
              {selectedDateKey
                ? `No photoshoots scheduled on ${formattedSelectedDate}`
                : `No photoshoots scheduled in ${monthName}`}
            </p>
            {isAdmin && (
              <Link
                href="/events/new"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-studio-accent hover:underline pt-1"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Schedule a shoot</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {activeEventsList.map((event) => {
              const isPublished = event.gallery_status === "PUBLISHED";
              const statusBg = isPublished
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : event.gallery_status === "DRAFT"
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-sky-50 text-sky-700 border-sky-200";

              const statusText = isPublished
                ? "Published"
                : event.gallery_status === "DRAFT"
                ? "Draft PIN"
                : "Active Shoot";

              return (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="p-3 bg-white border border-slate-200/90 rounded-2xl flex items-center justify-between gap-3 shadow-2xs hover:border-slate-300 transition-colors group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-studio-accent shrink-0" />
                    <div className="truncate">
                      <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                        {event.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium truncate">
                        {event.client_name ? `${event.client_name} • ` : ""}
                        {event.photos_count || 0} photos
                        {event.gallery_pin ? ` • PIN: ${event.gallery_pin}` : ""}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${statusBg}`}
                    >
                      {statusText}
                    </span>
                    <ArrowUpRight className="w-3 h-3 text-slate-400 group-hover:text-slate-700 transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
