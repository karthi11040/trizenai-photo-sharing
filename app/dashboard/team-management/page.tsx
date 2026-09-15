import { getAllTeamMembers } from "@/lib/db/users";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { TeamManagementClient } from "./TeamManagementClient";

export default async function TeamManagementPage() {
  const user = await getCurrentUser();
  if (!user || (!user.is_superuser && user.profile.role !== "ADMIN" && user.profile.role !== "CO_ADMIN")) {
    redirect("/dashboard/team");
  }

  const members = await getAllTeamMembers();

  return <TeamManagementClient initialMembers={members} currentUserId={user.id} />;
}
