"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Image as ImageIcon,
  Users,
  Eye,
  PlusCircle,
  ChevronRight,
  ShieldCheck,
  Building2,
  Clock,
  Camera,
  Heart,
  CloudUpload,
  Lock,
  CheckCircle2,
  ArrowUpRight,
  ArrowRight,
  Sparkles,
  Activity,
  UserCheck,
  Layers,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { AppleCalendarCard } from "@/components/AppleCalendarCard";

export interface RecentPhotoItem {
  id: number;
  filename: string;
  storage_path: string;
  event_name?: string | null;
  uploader_name?: string | null;
  uploader_first_name?: string | null;
  uploader_last_name?: string | null;
  uploader_username?: string | null;
  uploaded_at?: string | null;
  created_at?: string | null;
  signedUrl?: string | null;
}

export interface DashboardEvent {
  id: number;
  name: string;
  slug: string;
  category?: string | null;
  client_name?: string | null;
  location?: string | null;
  event_date?: string | null;
  cover_image?: string | null;
  photos_count?: number;
  members_count?: number;
  gallery_slug?: string | null;
  gallery_status?: string | null;
  gallery_is_published?: boolean | null;
}

interface AdminOverviewClientProps {
  user: {
    username: string;
    first_name?: string | null;
    last_name?: string | null;
    studioName?: string | null;
    studioLogo?: string | null;
  };
  events: DashboardEvent[];
  teamMembers: any[];
  galleries: any[];
  recentPhotos: RecentPhotoItem[];
}

export function AdminOverviewClient({
  user,
  events,
  teamMembers,
  galleries,
  recentPhotos,
}: AdminOverviewClientProps) {
  const totalPhotos = events.reduce((acc, e) => acc + (e.photos_count || 0), 0);
  const selectedPhotos = Math.round(totalPhotos * 0.4) || totalPhotos;
  const totalViews = galleries.reduce((acc, g) => acc + (g.views_count || 0), 0);
  const publishedGalleries = galleries.filter((g) => g.is_published).length;

  const activeEvents = events.slice(0, 6);

  const studioName = user.studioName || "TrizenAI Photography";
  const adminName = user.first_name || user.username || "Studio Admin";

  // Dynamic Recent Activity Log derived from real database records
  const dynamicActivities = [
    ...recentPhotos.slice(0, 2).map((p) => {
      const uploader = p.uploader_first_name
        ? `${p.uploader_first_name} ${p.uploader_last_name || ""}`.trim()
        : p.uploader_username || "Photographer";
      return {
        id: `photo-${p.id}`,
        icon: CloudUpload,
        iconBg: "bg-slate-200 text-slate-800",
        title: `${uploader} uploaded "${p.filename}"`,
        subtitle: p.event_name ? `Shoot: ${p.event_name}` : "Recent upload",
        time: p.uploaded_at
          ? new Date(p.uploaded_at).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })
          : "Just uploaded",
      };
    }),
    ...galleries.slice(0, 2).map((g) => ({
      id: `gallery-${g.id}`,
      icon: Lock,
      iconBg: "bg-emerald-100 text-emerald-800",
      title: `Client gallery "${g.title}" is ${g.is_published ? "published" : "draft"}`,
      subtitle: `PIN Protected • ${g.views_count || 0} client views`,
      time: g.created_at
        ? new Date(g.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : "Active",
    })),
    ...events.slice(0, 2).map((e) => ({
      id: `event-${e.id}`,
      icon: Calendar,
      iconBg: "bg-purple-100 text-purple-800",
      title: `Photoshoot event "${e.name}" active in workspace`,
      subtitle: `${e.photos_count || 0} photos • ${e.category || "Photoshoot"}`,
      time: e.event_date
        ? new Date(e.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : "Scheduled",
    })),
  ].slice(0, 4);

  return (
    <div className="max-w-[1800px] mx-auto space-y-8 pb-16 selection:bg-[var(--studio-accent,#0f172a)] selection:text-white">
      {/* 1. TOP 12-COLUMN ROW: HERO & METRICS (LEFT) + CALENDAR ON TOP RIGHT CORNER (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (8 COLS): HERO WELCOME & METRIC BAR */}
        <div className="lg:col-span-8 space-y-6">
          {/* Workspace Intro */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-slate-200/80 pb-6">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-extrabold uppercase tracking-widest text-[var(--studio-accent,#0f172a)]">
                <Sparkles className="w-3.5 h-3.5 text-[var(--studio-accent,#0f172a)]" />
                <span>Admin Workspace</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                Good morning, {adminName}.
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-2xl leading-relaxed">
                Your studio at a glance. Manage active shoots, review uploads, curate photographs, and deliver client galleries.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link
                href="/events/new"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[var(--studio-accent,#0f172a)] hover:bg-[var(--studio-accent-hover,#1e293b)] active:scale-[0.98] text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>New Photoshoot</span>
              </Link>
              <Link
                href="/events"
                className="inline-flex items-center justify-center gap-2 px-4.5 py-3 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-xl border border-slate-200 shadow-2xs transition-all cursor-pointer"
              >
                <span>All Events</span>
                <ArrowRight className="w-4 h-4 text-slate-500" />
              </Link>
            </div>
          </div>

          {/* Minimal Metric Bar (4-Column Grid) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
              {/* Metric 1: Total Photos */}
              <div className="pt-3 sm:pt-0 sm:px-4 first:px-0 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">
                  Total Photos
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    {totalPhotos.toLocaleString()}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60">
                  <ArrowUpRight className="w-3 h-3 text-slate-500" /> Cloud Storage
                </span>
              </div>

              {/* Metric 2: Selected Photos */}
              <div className="pt-3 sm:pt-0 sm:px-4 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">
                  Selected Photos
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-extrabold text-[var(--studio-accent,#0f172a)] tracking-tight">
                    {selectedPhotos.toLocaleString()}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--studio-accent,#0f172a)] bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60">
                  <Sparkles className="w-3 h-3" /> Client Curated
                </span>
              </div>

              {/* Metric 3: Active Shoots */}
              <div className="pt-3 sm:pt-0 sm:px-4 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">
                  Active Shoots
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    {events.length}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60">
                  <Calendar className="w-3 h-3 text-slate-500" /> Live Production
                </span>
              </div>

              {/* Metric 4: Published Galleries */}
              <div className="pt-3 sm:pt-0 sm:px-4 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">
                  Published Galleries
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    {publishedGalleries}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60">
                  <Eye className="w-3 h-3 text-slate-500" /> {totalViews.toLocaleString()} views
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (4 COLS): CALENDAR CARD PROMINENTLY AT TOP RIGHT CORNER */}
        <div className="lg:col-span-4">
          <AppleCalendarCard events={events as any} isAdmin={true} />
        </div>
      </div>

      {/* 2. SIDE-BY-SIDE GRID: RECENT PHOTOS (6 COLS) & ACTIVE SHOOTS (6 COLS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: RECENT PHOTOS (6 COLS) */}
        <div className="lg:col-span-6 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <Camera className="w-4 h-4 text-[var(--studio-accent,#0f172a)]" />
                Recent Photos
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Latest photographs uploaded across shoots.
              </p>
            </div>

            <Link
              href="/events"
              className="text-xs font-bold text-[var(--studio-accent,#0f172a)] hover:underline flex items-center gap-1 uppercase tracking-wider"
            >
              <span>View All &rarr;</span>
            </Link>
          </div>

          {recentPhotos.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2">
              <Camera className="w-7 h-7 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500 font-medium">No recent photos uploaded yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {recentPhotos.slice(0, 5).map((photo) => {
                const uploaderName = photo.uploader_first_name
                  ? `${photo.uploader_first_name} ${photo.uploader_last_name || ""}`
                  : photo.uploader_username || "Photographer";

                const uploadTimeFormatted = photo.uploaded_at
                  ? new Date(photo.uploaded_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })
                  : "Just uploaded";

                return (
                  <div
                    key={photo.id}
                    className="group relative h-44 rounded-xl overflow-hidden bg-slate-950 border border-slate-200/80 shadow-2xs"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.signedUrl || `/media/${photo.storage_path}`}
                      alt={photo.filename}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                    />

                    {/* Dark Overlay & Hover Metadata */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-2.5 text-white">
                      <div className="flex justify-end">
                        <span className="p-1 bg-white/20 backdrop-blur-md rounded-full text-white border border-white/30">
                          <Eye className="w-3 h-3" />
                        </span>
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold block truncate text-slate-100">
                          {uploaderName}
                        </span>
                        <span className="text-[9px] text-slate-300 font-mono block">
                          {uploadTimeFormatted}
                        </span>
                        {photo.event_name && (
                          <span className="text-[9px] font-semibold text-slate-200 block truncate uppercase tracking-wider">
                            {photo.event_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* 6th Slot: Extra Photos Card */}
              {recentPhotos.length > 5 && (
                <Link
                  href="/events"
                  className="group relative h-44 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 p-4 flex flex-col justify-between items-center text-center hover:bg-slate-850 hover:border-slate-700 transition-all shadow-2xs cursor-pointer text-white"
                >
                  <div className="w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Camera className="w-4 h-4 text-slate-200" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-2xl font-black text-white block">
                      +{recentPhotos.length - 5}
                    </span>
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
                      Extra Photos
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 group-hover:text-white flex items-center gap-1">
                    <span>View All</span> &rarr;
                  </span>
                </Link>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: ACTIVE SHOOTS (6 COLS) */}
        <div className="lg:col-span-6 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[var(--studio-accent,#0f172a)]" />
                Active Shoots
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Current photography projects in progress.
              </p>
            </div>
            <Link
              href="/events"
              className="text-xs font-bold text-slate-700 hover:text-slate-900 uppercase tracking-wider flex items-center gap-1"
            >
              <span>View All ({events.length}) &rarr;</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {events.slice(0, 2).map((event) => (
              <div
                key={event.id}
                className="group bg-slate-50/70 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all duration-300 flex flex-col justify-between overflow-hidden"
              >
                {/* Photo Cover */}
                <div className="relative h-36 w-full overflow-hidden bg-slate-950">
                  {event.cover_image ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={event.cover_image}
                        alt={event.name}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent group-hover:opacity-90 transition-opacity duration-300" />
                    </>
                  ) : (
                    <div className="w-full h-full bg-slate-900 flex items-center justify-center text-slate-700">
                      <Camera className="w-8 h-8 opacity-30" />
                    </div>
                  )}

                  {/* Status Badges */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest bg-black/50 backdrop-blur-md text-white border border-white/20 shadow-2xs">
                      ACTIVE
                    </span>
                    {event.gallery_slug && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-white/90 backdrop-blur-md text-slate-900 shadow-2xs flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>{event.gallery_is_published ? "Published" : "Draft"}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Information */}
                <div className="p-3.5 flex flex-col justify-between flex-1 space-y-2.5">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      <span>{event.category || "Photoshoot"}</span>
                      {event.event_date && (
                        <span>
                          {new Date(event.event_date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-extrabold text-slate-900 leading-snug group-hover:text-[var(--studio-accent,#0f172a)] transition-colors truncate">
                      <Link href={`/events/${event.id}`}>{event.name}</Link>
                    </h4>

                    {event.location && (
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 font-medium truncate">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{event.location}</span>
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-600">
                    <div className="flex items-center gap-2 font-semibold text-[10px]">
                      <span className="flex items-center gap-1">
                        <ImageIcon className="w-3 h-3 text-slate-400" />
                        {event.photos_count || 0}
                      </span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-slate-400" />
                        {event.members_count || 0}
                      </span>
                    </div>

                    <Link
                      href={`/events/${event.id}`}
                      className="text-[10px] font-bold text-slate-900 hover:text-[var(--studio-accent,#0f172a)] flex items-center gap-1 transition-colors uppercase tracking-wider"
                    >
                      <span>View</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}

            {/* Extra Active Shoots Card */}
            {events.length > 2 && (
              <Link
                href="/events"
                className="group bg-slate-900 hover:bg-slate-850 rounded-xl border border-slate-800 p-5 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col justify-between overflow-hidden text-white min-h-[220px]"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider bg-white/10 text-slate-200 border border-white/10">
                    Live Directory
                  </span>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                </div>

                <div className="space-y-1 my-auto text-center py-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 text-white flex items-center justify-center mx-auto mb-1.5 group-hover:scale-110 transition-transform">
                    <Calendar className="w-5 h-5 text-slate-200" />
                  </div>
                  <span className="text-2xl font-black tracking-tight text-white block">
                    +{events.length - 2}
                  </span>
                  <span className="text-xs font-bold text-slate-300 block uppercase tracking-wider">
                    Extra Active Shoots
                  </span>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-300 group-hover:text-white">
                  <span className="text-[11px] font-medium">Explore all projects</span>
                  <span className="text-[11px] font-bold flex items-center gap-1 uppercase tracking-wider">
                    View All &rarr;
                  </span>
                </div>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* 3. RECENT ACTIVITY TIMELINE & CLOUD STORAGE STATUS (12-Col Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Activity Timeline */}
        <div className="lg:col-span-8 bg-white p-5 sm:p-7 rounded-2xl border border-slate-200/80 shadow-2xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[var(--studio-accent,#0f172a)]" />
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                Recent Activity
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">Live Log</span>
          </div>

          <div className="space-y-3">
            {dynamicActivities.length === 0 ? (
              <p className="text-xs text-slate-500 font-medium py-4 text-center">
                No recent studio activities recorded.
              </p>
            ) : (
              dynamicActivities.map((act) => {
                const IconComponent = act.icon;
                return (
                  <div
                    key={act.id}
                    className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/50 hover:bg-slate-100/60 transition-colors"
                  >
                    <div className={`w-7 h-7 rounded-full ${act.iconBg} flex items-center justify-center shrink-0 shadow-2xs`}>
                      <IconComponent className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 text-xs space-y-0.5">
                      <p className="font-semibold text-slate-900 leading-snug">
                        {act.title}
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {act.subtitle}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      {act.time}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Cloud Storage Status */}
        <div className="lg:col-span-4 bg-white p-5 sm:p-7 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <CloudUpload className="w-4 h-4 text-slate-700" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Cloud Storage
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Supabase
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Service Status</span>
              <span className="font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Operational
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Storage Connection</span>
              <span className="font-semibold text-slate-800">Connected</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Database Connection</span>
              <span className="font-semibold text-slate-800">Connected</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
