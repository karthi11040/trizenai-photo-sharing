import { getEventById, getEventMembers } from "@/lib/db/events";
import { getPhotosByEventId } from "@/lib/db/photos";
import { getAllTeamMembers } from "@/lib/db/users";
import { getCurrentUser } from "@/lib/auth/session";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  MapPin,
  Users,
  Image as ImageIcon,
  UploadCloud,
  ExternalLink,
  CheckCircle2,
  ArrowLeft,
  Camera,
  ArrowRight,
  User,
  Lock,
  KeyRound,
} from "lucide-react";
import { getFastStorageUrl } from "@/lib/utils/image";
import { computeEventState } from "@/lib/utils/eventStatus";
import { AssignedTeamManager } from "./AssignedTeamManager";
import { EventStatusSelector } from "./EventStatusSelector";

interface EventDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const event = await getEventById(id);
  if (!event) notFound();

  const [members, rawPhotos, allTeamMembers] = await Promise.all([
    getEventMembers(event.id),
    getPhotosByEventId(event.id),
    getAllTeamMembers(),
  ]);

  const isAdmin = Boolean(user.is_superuser || user.profile?.role === "ADMIN" || user.profile?.role === "CO_ADMIN");

  // Filter allTeamMembers to active members or admins only
  const activeTeamMembers = allTeamMembers.filter((m) => {
    const isMemberAdmin = Boolean(m.is_superuser || m.profile?.role === "ADMIN" || m.profile?.role === "CO_ADMIN");
    const isActive = m.profile?.status === "ACTIVE" || m.profile?.status === undefined;
    return isMemberAdmin || isActive;
  });

  // Instantly resolve cover image & recent photos URLs synchronously
  const coverImage = getFastStorageUrl(event.cover_image);

  const recentPhotos = rawPhotos.slice(0, 10).map((photo) => ({
    ...photo,
    signedUrl: getFastStorageUrl(photo.storage_path) || `/media/${photo.storage_path}`,
  }));

  return (
    <div className="space-y-6 pb-16 selection:bg-slate-900 selection:text-white">
      {/* 1. SIMPLE NAVIGATION & STATUS BAR */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <Link
          href="/events"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to All Shoots</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <EventStatusSelector event={event} isAdmin={isAdmin} />

          <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 font-bold uppercase tracking-wider text-slate-700 text-[10px]">
            {event.category || "Photoshoot"}
          </span>
          {event.gallery_slug ? (
            <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>PIN Gallery Active</span>
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-bold text-[10px] uppercase tracking-wider">
              Draft Project
            </span>
          )}
        </div>
      </div>

      {/* 2. HERO HEADER & ASSIGNED TEAM (TOP RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Hero Card */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-12 items-center">
            {/* Visual Thumbnail */}
            <div className="md:col-span-5 relative h-48 sm:h-56 md:h-full min-h-[220px] bg-slate-950">
              {coverImage ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverImage}
                    alt={event.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
                </>
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-slate-900 to-indigo-950 flex items-center justify-center text-slate-700">
                  <Camera className="w-12 h-12 opacity-30" />
                </div>
              )}
            </div>

            {/* Shoot Information & Toolbar */}
            <div className="md:col-span-7 p-6 space-y-4">
              <div>
                <span className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase block mb-1">
                  Project #{event.id}
                </span>
                <h1 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight font-[var(--studio-font-family,inherit)]">
                  {event.name}
                </h1>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium mt-2 font-[var(--studio-font-family,inherit)]">
                  {event.client_name && (
                    <span className="flex items-center gap-1.5 text-slate-800 font-bold">
                      <User className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Client: {event.client_name}</span>
                    </span>
                  )}
                  {event.location && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{event.location}</span>
                    </span>
                  )}
                  {event.event_date && (
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {new Date(event.event_date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </span>
                  )}
                </div>
              </div>

              {/* Direct Admin Toolbar Actions */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
                <Link
                  href={`/events/${event.slug || event.id}/photos`}
                  className="px-3.5 py-2 bg-[var(--studio-accent,#0f172a)] hover:bg-[var(--studio-accent-hover,#1e293b)] text-white font-extrabold text-[11px] rounded-xl shadow-xs transition-all flex items-center gap-1.5 uppercase tracking-wider"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Select & Edit Photos ({event.photos_count || 0})</span>
                </Link>

                <Link
                  href={`/events/${event.slug || event.id}/photos`}
                  className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-900 font-extrabold text-[11px] rounded-xl transition-all flex items-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Set PIN</span>
                </Link>

                {event.gallery_slug && (
                  <Link
                    href={`/gallery/${event.gallery_slug}`}
                    target="_blank"
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] rounded-xl transition-all flex items-center gap-1.5 border border-slate-200"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
                    <span>Client Gallery</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Top Column: Assigned Team Manager (TOP RIGHT) */}
        <div className="lg:col-span-4">
          <AssignedTeamManager
            eventId={event.id}
            initialAssignedMembers={members}
            allActiveTeamMembers={activeTeamMembers}
            isAdmin={isAdmin}
          />
        </div>
      </div>

      {/* 3. MEDIA UPLOAD STATUS & PHOTO MANAGEMENT STRIP */}
      {(() => {
        const stateDetails = computeEventState(event);
        return (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xs space-y-5">
            {/* Media Upload Status Banner */}
            <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              stateDetails.mediaStatus === "UPLOAD_REQUIRED"
                ? "bg-amber-50/90 border-amber-200 text-amber-950"
                : stateDetails.mediaStatus === "IMAGES_AVAILABLE"
                ? "bg-indigo-50/90 border-indigo-200 text-indigo-950"
                : "bg-slate-50 border-slate-200 text-slate-800"
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                  stateDetails.mediaStatus === "UPLOAD_REQUIRED"
                    ? "bg-amber-500 text-white shadow-xs"
                    : stateDetails.mediaStatus === "IMAGES_AVAILABLE"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-200 text-slate-700"
                }`}>
                  {stateDetails.mediaStatus === "UPLOAD_REQUIRED" ? (
                    <UploadCloud className="w-5 h-5" />
                  ) : (
                    <ImageIcon className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Media Upload Status</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white/80 border border-current shadow-2xs">
                      {stateDetails.mediaStatusLabel}
                    </span>
                  </div>
                  <p className="text-xs font-semibold mt-0.5">
                    {stateDetails.mediaStatus === "UPLOAD_REQUIRED"
                      ? "Shoot is completed! High-res photos need to be uploaded to publish PIN client gallery."
                      : stateDetails.mediaStatus === "IMAGES_AVAILABLE"
                      ? `${rawPhotos.length} high-resolution photographs ingested & available in this gallery.`
                      : "Pending shoot media ingestion."}
                  </p>
                </div>
              </div>

              <Link
                href={`/events/${event.slug || event.id}/photos`}
                className={`px-4 py-2 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 shrink-0 ${
                  stateDetails.mediaStatus === "UPLOAD_REQUIRED"
                    ? "bg-amber-600 hover:bg-amber-700 text-white"
                    : "bg-slate-900 hover:bg-slate-800 text-white"
                }`}
              >
                <UploadCloud className="w-4 h-4" />
                <span>{stateDetails.mediaStatus === "UPLOAD_REQUIRED" ? "Upload Images Now" : "Manage & Upload Media"}</span>
              </Link>
            </div>

            {/* Photos Preview Grid */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-bold text-slate-900 font-serif">
                  Photos & Media Gallery ({recentPhotos.length})
                </h3>
              </div>

              <Link
                href={`/events/${event.slug || event.id}/photos`}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors uppercase tracking-wider"
              >
                <span>Manage & Edit All ({rawPhotos.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentPhotos.length === 0 ? (
              <div className="p-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
                <Camera className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500 font-medium">
                  No photos uploaded to this project gallery yet.
                </p>
                <Link
                  href={`/events/${event.slug || event.id}/photos`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Upload Shoot Photos</span>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-3">
                {recentPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className="aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200 group relative shadow-xs"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.signedUrl}
                      alt={photo.filename}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Link
                        href={`/events/${event.slug || event.id}/photos`}
                        className="p-1.5 bg-white text-slate-900 rounded-lg shadow-md hover:scale-110 transition-transform"
                        title="Manage Photos"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* 4. SHOOT BRIEF & INSTRUCTIONS */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
          Instructions & Client Notes
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
          {event.description || "No specific instructions provided for this photoshoot project."}
        </p>
      </div>
    </div>
  );
}

