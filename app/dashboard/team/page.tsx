import { getCurrentUser } from "@/lib/auth/session";
import { getEventsByUserId } from "@/lib/db/events";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AppleCalendarCard } from "@/components/AppleCalendarCard";
import { EventStatusBadge } from "@/components/events/EventStatusBadge";
import {
  Calendar,
  Image as ImageIcon,
  UploadCloud,
  ChevronRight,
  ExternalLink,
  Clock,
  Camera,
} from "lucide-react";

export default async function TeamDashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const events = await getEventsByUserId(user.id, false);
  const totalPhotos = events.reduce((acc, e) => acc + (e.photos_count || 0), 0);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Photographer Workspace
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
              Photographer
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Welcome back, {user.first_name || user.username}. View your assigned photography events and upload high-res shots.
          </p>
        </div>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Assigned Shoots
            </span>
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900">{events.length}</span>
            <span className="block text-xs text-slate-400 mt-0.5">Events assigned to your profile</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Event Media
            </span>
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold">
              <ImageIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900">{totalPhotos}</span>
            <span className="block text-xs text-slate-400 mt-0.5">Photos across your events</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left = Assigned Events, Right = Embedded Apple Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Assigned Events List */}
        <div className="lg:col-span-7 xl:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200/80">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Your Assigned Events</h2>
            </div>

            {events.length === 0 ? (
              <div className="p-16 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 mx-auto flex items-center justify-center">
                  <Camera className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">No events assigned yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Your studio administrator has not assigned you to any upcoming photoshoot events yet.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">{event.name}</h3>
                        <EventStatusBadge status={event.status} size="sm" />
                        {event.gallery_status === "PUBLISHED" && (
                          <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                            PUBLISHED
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        {event.event_date && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {new Date(event.event_date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        )}
                        <span>•</span>
                        <span>{event.photos_count || 0} photos</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/events/${event.id}/photos`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[var(--studio-accent,#0f172a)] hover:bg-[var(--studio-accent-hover,#1e293b)] active:scale-[0.98] rounded-xl shadow-xs transition-colors"
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>Upload Photos</span>
                      </Link>
                      {event.gallery_slug && (
                        <Link
                          href={`/gallery/${event.gallery_slug}`}
                          target="_blank"
                          className="px-3 py-2 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 rounded-xl transition-colors flex items-center gap-1"
                        >
                          <span>PIN Gallery</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Embedded Apple Calendar */}
        <div className="lg:col-span-5 xl:col-span-5">
          <AppleCalendarCard events={events} isAdmin={false} />
        </div>
      </div>
    </div>
  );
}
