import { getCurrentUser } from "@/lib/auth/session";
import { getEventsByUserId } from "@/lib/db/events";
import { redirect } from "next/navigation";
import { EventsClientPage } from "./EventsClientPage";
import { getFastStorageUrl } from "@/lib/utils/image";

export default async function EventsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const isAdmin = user.is_superuser || user.profile.role === "ADMIN" || user.profile.role === "CO_ADMIN";
  const rawEvents = await getEventsByUserId(user.id, isAdmin);

  // Instantly resolve cover image URLs synchronously without remote REST API roundtrips
  const events = rawEvents.map((e: any) => ({
    ...e,
    cover_image: getFastStorageUrl(e.cover_image),
  }));

  return <EventsClientPage events={events} isAdmin={isAdmin} />;
}
