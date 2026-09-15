import { getCurrentUser } from "@/lib/auth/session";
import { getGalleriesList } from "@/lib/db/galleries";
import { redirect } from "next/navigation";
import { GalleriesListClient } from "./GalleriesListClient";

export default async function GalleriesListPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const galleries = await getGalleriesList();

  return <GalleriesListClient galleries={galleries} />;
}
