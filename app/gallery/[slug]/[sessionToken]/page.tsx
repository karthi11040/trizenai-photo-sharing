import { getGalleryBySlug, getGalleryPhotos } from "@/lib/db/galleries";
import { notFound } from "next/navigation";
import { ClientGalleryView } from "./ClientGalleryView";

interface UnlockedGalleryPageProps {
  params: Promise<{ slug: string; sessionToken: string }>;
}

export default async function UnlockedGalleryPage({ params }: UnlockedGalleryPageProps) {
  const { slug, sessionToken } = await params;
  const gallery = await getGalleryBySlug(slug);

  if (!gallery || !sessionToken) {
    notFound();
  }

  const photos = await getGalleryPhotos(gallery.id);

  return (
    <ClientGalleryView
      gallery={gallery}
      photos={photos}
      slug={slug}
    />
  );
}
