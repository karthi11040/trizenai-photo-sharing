import { getCurrentUser } from "@/lib/auth/session";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { redirect } from "next/navigation";

export default async function GalleriesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const navUser = {
    username: user.username,
    email: user.email,
    isAdmin: user.is_superuser || user.profile.role === "ADMIN" || user.profile.role === "CO_ADMIN",
    dashboardToken: user.profile.dashboard_token,
    studioName: user.profile.studio_name,
    studioLogo: user.profile.studio_logo,
  };

  return (
    <div className="h-screen overflow-hidden bg-slate-50 flex flex-col" suppressHydrationWarning>
      <Navbar user={navUser} />
      <div className="flex-1 flex w-full min-h-0 overflow-hidden" suppressHydrationWarning>
        <Sidebar
          isAdmin={navUser.isAdmin}
          dashboardToken={navUser.dashboardToken}
          studioName={navUser.studioName}
          studioLogo={navUser.studioLogo}
        />
        <main className="flex-1 p-6 sm:p-8 lg:p-10 min-w-0 overflow-y-auto" suppressHydrationWarning>
          {children}
        </main>
      </div>
    </div>
  );
}
