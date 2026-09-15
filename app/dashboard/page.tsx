import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.is_superuser || user.profile.role === "ADMIN" || user.profile.role === "CO_ADMIN") {
    redirect(`/dashboard/admin/${user.profile.dashboard_token}`);
  } else {
    redirect("/dashboard/team");
  }
}
