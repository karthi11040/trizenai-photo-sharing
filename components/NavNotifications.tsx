"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  Calendar,
  Image as ImageIcon,
  ShieldCheck,
  ExternalLink,
  CloudUpload,
  Clock,
  X,
} from "lucide-react";

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  unread: boolean;
  icon: "cloud" | "event" | "security" | "gallery";
  link?: string;
}

export function NavNotifications() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: "notif-1",
      title: "Cloud Storage Active",
      description: "Supabase S3 bucket is connected and ready for high-res ingestion.",
      time: "Just now",
      unread: true,
      icon: "cloud",
      link: "/events",
    },
    {
      id: "notif-2",
      title: "PIN Security Enabled",
      description: "Client galleries are protected with 4-digit PIN access control.",
      time: "10m ago",
      unread: true,
      icon: "security",
      link: "/galleries",
    },
    {
      id: "notif-3",
      title: "Production Workspace Ready",
      description: "Tethered capture hot-folders configured for Sony & Leica units.",
      time: "1h ago",
      unread: true,
      icon: "event",
      link: "/events",
    },
  ]);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => n.unread).length;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  function markAllAsRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  }

  function markAsRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: false } : n))
    );
  }

  function clearNotification(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer focus:outline-none"
        title="Notifications"
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
        )}
      </button>

      {/* Notifications Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150 select-none">
          {/* Header */}
          <div className="px-4 pb-2.5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                  {unreadCount} New
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* List of Notifications */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No notifications right now
              </div>
            ) : (
              notifications.map((n) => {
                const IconComponent =
                  n.icon === "cloud"
                    ? CloudUpload
                    : n.icon === "security"
                    ? ShieldCheck
                    : n.icon === "gallery"
                    ? ImageIcon
                    : Calendar;

                const iconBg =
                  n.icon === "cloud"
                    ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                    : n.icon === "security"
                    ? "bg-blue-50 text-blue-600 border-blue-100"
                    : "bg-rose-50 text-rose-600 border-rose-100";

                return (
                  <Link
                    key={n.id}
                    href={n.link || "#"}
                    onClick={() => {
                      markAsRead(n.id);
                      setIsOpen(false);
                    }}
                    className={`p-3.5 flex items-start gap-3 hover:bg-slate-50 transition-colors group relative ${
                      n.unread ? "bg-slate-50/50" : ""
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${iconBg}`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {n.title}
                        </span>
                        {n.unread && (
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                        {n.description}
                      </p>
                      <span className="text-[10px] text-slate-400 font-medium block mt-1">
                        {n.time}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => clearNotification(n.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-600 rounded-md transition-opacity absolute top-3 right-3"
                      title="Dismiss"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Link>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 pt-2.5 border-t border-slate-100 text-center">
            <Link
              href="/events"
              onClick={() => setIsOpen(false)}
              className="text-[11px] font-bold text-slate-700 hover:text-slate-900 block"
            >
              View Activity & Telemetry →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
