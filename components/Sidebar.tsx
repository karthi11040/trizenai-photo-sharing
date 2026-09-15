"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Image as ImageIcon,
  Users,
  Sliders,
  PlusCircle,
  Camera,
  CloudUpload,
  ChevronsUpDown,
  HardDrive,
  Settings,
} from "lucide-react";

interface SidebarProps {
  isAdmin: boolean;
  dashboardToken?: string;
  studioName?: string;
  studioLogo?: string;
}

export function Sidebar({ isAdmin, dashboardToken, studioName, studioLogo }: SidebarProps) {
  const pathname = usePathname();

  const adminDashboardUrl = dashboardToken ? `/dashboard/admin/${dashboardToken}` : "/dashboard/admin";

  const isOverviewActive = pathname === "/dashboard/admin" || pathname.startsWith("/dashboard/admin/") || pathname === "/dashboard/team";
  const isEventsActive = pathname === "/events" || pathname.startsWith("/events/");
  const isGalleriesActive = pathname === "/galleries" || pathname.startsWith("/galleries/");
  const isTeamActive = pathname === "/dashboard/team-management" || pathname.startsWith("/dashboard/team-management/") || pathname === "/dashboard/administrators";
  const isSettingsActive = pathname === "/dashboard/settings" || pathname.startsWith("/dashboard/settings/");

  return (
    <aside className="w-64 shrink-0 bg-white border-r border-slate-200 sticky top-16 h-[calc(100vh-4rem)] p-4 flex flex-col justify-between hidden lg:flex select-none z-30 overflow-y-auto" suppressHydrationWarning>
      <div className="space-y-5 pr-1">
        {/* Studio Workspace Header (Single, Clean) */}
        <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between hover:border-slate-300 transition-colors group">
          <div className="flex items-center gap-2.5 min-w-0">
            {studioLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={studioLogo}
                alt={studioName || "Studio Logo"}
                className="w-8 h-8 rounded-xl object-contain border border-slate-200 shadow-2xs shrink-0"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className="w-8 h-8 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0 tracking-wider">
                {studioName ? studioName[0].toUpperCase() : "ES"}
              </div>
            )}
            <div className="truncate">
              <h4 className="text-xs font-bold text-slate-900 group-hover:text-slate-950 truncate">
                {studioName || "TrizenAI Studio"}
              </h4>
              <span className="text-[10px] text-slate-400 font-medium block truncate">
                Photography Workspace
              </span>
            </div>
          </div>
          <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        </div>

        {/* SECTION 1: WORKSPACE */}
        <div className="space-y-1">
          <div className="px-3 pb-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            Workspace
          </div>

          <Link
            href={isAdmin ? adminDashboardUrl : "/dashboard/team"}
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              isOverviewActive
                ? "bg-studio-accent text-white font-bold shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <div className="flex items-center gap-3">
              <LayoutDashboard className={`w-4 h-4 ${isOverviewActive ? "text-white" : "text-slate-400"}`} />
              <span>Overview</span>
            </div>
          </Link>

          <Link
            href="/events"
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              isEventsActive
                ? "bg-studio-accent text-white font-bold shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <div className="flex items-center gap-3">
              <Calendar className={`w-4 h-4 ${isEventsActive ? "text-white" : "text-slate-400"}`} />
              <span>Events & Shoots</span>
            </div>
          </Link>

          <Link
            href="/galleries"
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              isGalleriesActive
                ? "bg-studio-accent text-white font-bold shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <div className="flex items-center gap-3">
              <ImageIcon className={`w-4 h-4 ${isGalleriesActive ? "text-white" : "text-slate-400"}`} />
              <span>Client Galleries</span>
            </div>
          </Link>

          {isAdmin && (
            <Link
              href="/dashboard/team-management"
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isTeamActive
                  ? "bg-studio-accent text-white font-bold shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className={`w-4 h-4 ${isTeamActive ? "text-white" : "text-slate-400"}`} />
                <span>Team Members</span>
              </div>
            </Link>
          )}
        </div>

        {/* SECTION 2: CONFIGURATION */}
        {isAdmin && (
          <div className="space-y-1 pt-2">
            <div className="px-3 pb-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Configuration
            </div>

            <Link
              href="/dashboard/settings"
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isSettingsActive
                  ? "bg-studio-accent text-white font-bold shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <div className="flex items-center gap-3">
                <Sliders className={`w-4 h-4 ${isSettingsActive ? "text-white" : "text-slate-400"}`} />
                <span>Studio Settings</span>
              </div>
            </Link>
          </div>
        )}
      </div>

      {/* Bottom Section: Storage Sync Telemetry & Create Shoot CTA */}
      <div className="pt-4 border-t border-slate-100 space-y-3">
        {/* Storage Sync Telemetry Box */}
        <div className="p-3 bg-slate-50/90 border border-slate-200/80 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">Cloud Storage</span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Supabase
            </span>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
            <span>Storage Status</span>
            <span className="font-semibold text-slate-800">Operational</span>
          </div>
        </div>

        {/* Create Photoshoot Button */}
        {isAdmin && (
          <Link
            href="/events/new"
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs font-bold text-white bg-studio-accent active:scale-[0.98] rounded-xl shadow-xs transition-all hover:opacity-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Photoshoot</span>
          </Link>
        )}
      </div>
    </aside>
  );
}
