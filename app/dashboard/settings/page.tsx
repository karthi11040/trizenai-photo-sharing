import { getCurrentUser } from "@/lib/auth/session";
import { findUserById } from "@/lib/db/users";
import { redirect } from "next/navigation";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user || (!user.is_superuser && user.profile.role !== "ADMIN" && user.profile.role !== "CO_ADMIN")) {
    redirect("/dashboard/team");
  }

  const fullUser = await findUserById(user.id);
  if (!fullUser) {
    redirect("/login");
  }

  return <SettingsClient user={fullUser} />;
}
