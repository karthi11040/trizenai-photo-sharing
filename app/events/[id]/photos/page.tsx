import { getEventById } from "@/lib/db/events";
import { getPhotosGroupedByUploadDay } from "@/lib/db/photos";
import { getGalleryPhotoIds } from "@/lib/db/galleries";
import { getCurrentUser } from "@/lib/auth/session";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  Clock,
  ArrowLeft,
  Sparkles,
  UploadCloud,
  Share2,
  Lock,
} from "lucide-react";
import { PhotoGalleryClient } from "./PhotoGalleryClient";

interface PhotosPageProps {
  params: Promise<{ id: string }>;
}

export default async function PhotosPage({ params }: PhotosPageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const event = await getEventById(id);
  if (!event) notFound();

  const userRole = user.profile?.role || "TEAM_MEMBER";
  const isAdmin = Boolean(user.is_superuser || userRole === "ADMIN" || userRole === "CO_ADMIN");

  const [dayGroups, galleryPhotoIds] = await Promise.all([
    getPhotosGroupedByUploadDay(event.id),
    getGalleryPhotoIds(event.id),
  ]);

  const totalPhotosCount = dayGroups.reduce((acc, g) => acc + g.photos.length, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Link
              href={`/events/${event.id}`}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {event.name} — Media Stream
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/50">
              {totalPhotosCount} Photos Ingested
            </span>
          </div>
          <p className="text-xs text-slate-500 ml-9">
            Day-grouped chronological photo feed preserving discrete shoot sessions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {event.gallery_slug && (
            <Link
              href={`/gallery/${event.gallery_slug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
            >
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>Client PIN Link</span>
            </Link>
          )}
        </div>
      </div>

      {/* Interactive Photo Stream Client Component */}
      <PhotoGalleryClient
        eventId={event.id}
        eventName={event.name}
        eventDate={event.event_date}
        dayGroups={dayGroups}
        gallerySlug={event.gallery_slug}
        initialGalleryPhotoIds={galleryPhotoIds}
        userRole={userRole}
        isAdmin={isAdmin}
      />
    </div>
  );
}
