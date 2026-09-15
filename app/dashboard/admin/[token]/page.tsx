import { findUserByDashboardToken, getAllTeamMembers } from "@/lib/db/users";
import { getAllEvents } from "@/lib/db/events";
import { getGalleriesList } from "@/lib/db/galleries";
import { getAllRecentPhotos } from "@/lib/db/photos";
import { notFound } from "next/navigation";
import { AdminOverviewClient } from "./AdminOverviewClient";
import { getFastStorageUrl } from "@/lib/utils/image";

interface AdminDashboardProps {
  params: Promise<{ token: string }>;
}

export default async function AdminDashboardPage({ params }: AdminDashboardProps) {
  const { token } = await params;
  const user = await findUserByDashboardToken(token);

  if (!user) {
    notFound();
  }

  const [rawEvents, teamMembers, galleries, rawPhotos] = await Promise.all([
    getAllEvents(),
    getAllTeamMembers(),
    getGalleriesList(),
    getAllRecentPhotos(10),
  ]);

  // Enrich event cover images instantly
  const events = rawEvents.map((e: any) => ({
    ...e,
    cover_image: getFastStorageUrl(e.cover_image),
  }));

  // Enrich recent photos instantly
  const recentPhotos = rawPhotos.map((p: any) => ({
    ...p,
    signedUrl: getFastStorageUrl(p.storage_path) || `/media/${p.storage_path}`,
  }));

  const userProps = {
    username: user.username,
    first_name: user.first_name,
    last_name: user.last_name,
    studioName: user.profile?.studio_name,
    studioLogo: user.profile?.studio_logo,
  };

  return (
    <AdminOverviewClient
      user={userProps}
      events={events}
      teamMembers={teamMembers}
      galleries={galleries}
      recentPhotos={recentPhotos}
    />
  );
}
