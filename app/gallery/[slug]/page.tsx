import { getGalleryBySlug, getGalleryPhotos, recordGalleryView } from "@/lib/db/galleries";
import { notFound } from "next/navigation";
import { GalleryUnlockKeypad } from "./GalleryUnlockKeypad";
import { ShieldCheck, Lock } from "lucide-react";
import { getFastStorageUrl } from "@/lib/utils/image";

interface GalleryPinPageProps {
  params: Promise<{ slug: string }>;
}

export default async function GalleryPinPage({ params }: GalleryPinPageProps) {
  const { slug } = await params;
  const gallery = await getGalleryBySlug(slug);

  if (!gallery) {
    notFound();
  }

  // Instantly resolve cover image URL (0ms network latency)
  let coverThumbnail: string | null = getFastStorageUrl(gallery.event_cover_image);

  // Fallback to first photo only if event cover image is not defined
  if (!coverThumbnail) {
    const photos = await getGalleryPhotos(gallery.id);
    if (photos.length > 0) {
      coverThumbnail = getFastStorageUrl(photos[0].storage_path) || photos[0].signedUrl || null;
    }
  }

  // Record real client page view telemetry
  try {
    await recordGalleryView(gallery.id, "127.0.0.1", "Web Client", "Desktop/Mobile");
  } catch (err) {
    console.warn("View record notice:", err);
  }

  const studioName = gallery.studio_name || "ES STUDIOS";
  const pinLength = gallery.pin_code ? gallery.pin_code.trim().length : 4;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between p-4 sm:p-6 lg:p-10 relative overflow-x-hidden selection:bg-slate-900 selection:text-white font-sans">
      {/* Full-Screen Ambient Blurred Cover Image Backdrop (Light Mode) */}
      {coverThumbnail && (
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverThumbnail}
            alt=""
            className="w-full h-full object-cover scale-110 blur-3xl opacity-10 mix-blend-multiply"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-50/80 via-slate-50/90 to-slate-50" />
        </div>
      )}

      {/* Dynamic Soft Ambient Lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[550px] bg-gradient-to-tr from-slate-200/40 via-indigo-100/30 to-transparent rounded-full blur-[160px] pointer-events-none z-0" />

      {/* Large Screen Branding Header (Outside Main Card) */}
      <header className="relative z-10 max-w-[1240px] mx-auto w-full flex items-center justify-between py-4 px-2 sm:px-4">
        {/* Top-Left: Studio Logo & Title */}
        <div className="flex items-center gap-3.5">
          {gallery.studio_logo ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={gallery.studio_logo}
              alt={studioName}
              className="h-10 max-h-10 w-auto max-w-[180px] object-contain rounded-md filter drop-shadow-xs"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-extrabold text-lg tracking-wider shadow-sm">
              {studioName.substring(0, 2).toUpperCase()}
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-sm font-black tracking-widest uppercase text-slate-900 leading-tight font-serif">
              {studioName}
            </span>
            <span className="text-[11px] text-slate-500 font-medium tracking-wide">
              Official Client Gallery
            </span>
          </div>
        </div>

        {/* Top-Right: Secure Access Pill Badge */}
        <div className="flex items-center gap-2 text-xs text-slate-700 bg-white/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-200 shadow-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold tracking-wider text-[11px] uppercase">Secure Access</span>
        </div>
      </header>

      {/* Main Unlock Container Box (Centered for 1440px, 1600px, 1920px, 2560px) */}
      <main className="relative z-10 max-w-[1240px] w-full mx-auto my-auto py-6 sm:py-10 px-2 sm:px-4 flex items-center justify-center">
        <GalleryUnlockKeypad
          slug={gallery.slug}
          galleryTitle={gallery.title}
          eventName={gallery.event_name}
          eventDate={gallery.event_date}
          eventLocation={gallery.event_location}
          coverThumbnail={coverThumbnail}
          studioName={studioName}
          pinLength={pinLength}
        />
      </main>

      {/* Large Screen Footer */}
      <footer className="relative z-10 max-w-[1240px] mx-auto w-full flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 py-4 px-2 sm:px-4 border-t border-slate-200/80 gap-2">
        <span className="tracking-wide">
          &copy; {new Date().getFullYear()} {studioName}. All Rights Reserved.
        </span>
        <div className="flex items-center gap-2 text-slate-600">
          <Lock className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-medium tracking-wide">Private Photo Delivery</span>
        </div>
      </footer>
    </div>
  );
}
