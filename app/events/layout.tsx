import { getCurrentUser } from "@/lib/auth/session";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { SuspendedAccountModal } from "@/components/SuspendedAccountModal";
import { redirect } from "next/navigation";

export default async function EventsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const isAdmin = user.is_superuser || user.profile?.role === "ADMIN" || user.profile?.role === "CO_ADMIN";
  const userStatus = user.profile?.status || "ACTIVE";
  const isRestricted = !isAdmin && userStatus !== "ACTIVE";

  const navUser = {
    username: user.username,
    email: user.email,
    isAdmin,
    dashboardToken: user.profile.dashboard_token,
    studioName: user.profile.studio_name,
    studioLogo: user.profile.studio_logo,
  };

  return (
    <div className="h-screen overflow-hidden bg-slate-50 flex flex-col relative" suppressHydrationWarning>
      {isRestricted && <SuspendedAccountModal status={userStatus} />}
      <Navbar user={navUser} />
      <div className="flex-1 flex w-full min-h-0 overflow-hidden" suppressHydrationWarning>
        <Sidebar
          isAdmin={navUser.isAdmin}
          dashboardToken={navUser.dashboardToken}
          studioName={navUser.studioName}
          studioLogo={navUser.studioLogo}
        />
        <main className={`flex-1 p-6 sm:p-8 lg:p-10 min-w-0 overflow-y-auto ${isRestricted ? "pointer-events-none blur-xs select-none" : ""}`} suppressHydrationWarning>
          {children}
        </main>
      </div>
    </div>
  );
}
