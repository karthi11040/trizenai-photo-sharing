"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LogOut,
  LayoutDashboard,
  Calendar,
  Image as ImageIcon,
  Users,
  ShieldCheck,
  Sliders,
  PlusCircle,
  Menu,
  X,
  Camera,
  ChevronRight,
  Cloud,
  CheckCircle2,
  Search,
} from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { NavSearchAutocomplete } from "@/components/NavSearchAutocomplete";
import { NavNotifications } from "@/components/NavNotifications";

interface NavbarProps {
  user?: {
    username: string;
    email: string;
    isAdmin: boolean;
    dashboardToken?: string;
    studioName?: string;
    studioLogo?: string;
  } | null;
}

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const adminDashboardUrl = user?.dashboardToken ? `/dashboard/admin/${user.dashboardToken}` : "/dashboard/admin";

  const mobileNavLinks = user?.isAdmin
    ? [
        { href: adminDashboardUrl, label: "Overview", icon: LayoutDashboard },
        { href: "/events", label: "Events & Shoots", icon: Calendar },
        { href: "/galleries", label: "Client Galleries", icon: ImageIcon },
        { href: "/dashboard/team-management", label: "Team Members", icon: Users },
        { href: "/dashboard/administrators", label: "Administrators", icon: ShieldCheck },
        { href: "/dashboard/settings", label: "Studio Settings", icon: Sliders },
      ]
    : [
        { href: "/dashboard/team", label: "My Shoots", icon: LayoutDashboard },
        { href: "/events", label: "Assigned Events", icon: Calendar },
        { href: "/galleries", label: "Published Galleries", icon: ImageIcon },
      ];

  function isLinkActive(href: string) {
    if (href === adminDashboardUrl || href === "/dashboard/admin") {
      return pathname === "/dashboard/admin" || pathname.startsWith("/dashboard/admin/");
    }
    if (href === "/dashboard/team") {
      return pathname === "/dashboard/team" || pathname.startsWith("/dashboard/team/");
    }
    if (href === "/events") {
      return pathname === "/events" || pathname.startsWith("/events/");
    }
    if (href === "/galleries") {
      return pathname === "/galleries" || pathname.startsWith("/galleries/");
    }
    if (href === "/dashboard/team-management") {
      return pathname === "/dashboard/team-management" || pathname.startsWith("/dashboard/team-management/");
    }
    if (href === "/dashboard/administrators") {
      return pathname === "/dashboard/administrators" || pathname.startsWith("/dashboard/administrators/");
    }
    if (href === "/dashboard/settings") {
      return pathname === "/dashboard/settings" || pathname.startsWith("/dashboard/settings/");
    }
    return pathname === href;
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md select-none" suppressHydrationWarning>
      <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between" suppressHydrationWarning>
        {/* Left: Brand & Studio Name (Always visible on mobile, tablet & desktop) */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group focus:outline-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={user?.studioLogo || "/img/logo.png"}
              alt={user?.studioName || "TrizenAI Studio"}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/img/logo.png";
              }}
              className="h-8 max-h-8 w-auto max-w-[120px] rounded-lg object-contain transition-transform group-hover:scale-105"
            />
            <div className="flex flex-col text-left">
              <span className="text-sm font-bold text-slate-900 tracking-tight block leading-tight truncate max-w-[140px] sm:max-w-xs">
                {user?.studioName || "TrizenAI Studio"}
              </span>
              <span className="text-[9px] sm:text-[10px] text-slate-500 font-bold tracking-wider uppercase block">
                Photography Workspace
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Desktop Workspace Status & Live Telemetry + Autocomplete Search */}
        {user && (
          <div className="hidden md:flex items-center gap-4 flex-1 max-w-xl mx-6">
            {/* Live Autocomplete Event Search */}
            <div className="w-full">
              <NavSearchAutocomplete />
            </div>

            {/* Live Cloud Status Pill */}
            <div className="hidden xl:inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200/90 rounded-2xl text-xs font-semibold text-slate-700 shadow-2xs shrink-0">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-bold text-slate-800">Storage Active</span>
              <span className="text-[10px] text-slate-400 font-medium border-l border-slate-200 pl-2">
                Supabase S3
              </span>
            </div>
          </div>
        )}

        {/* Right: Actions, Notifications, Profile & Mobile Trigger */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              {/* Notification Popover Dropdown */}
              <NavNotifications />

              {/* Quick Create Photoshoot Button (Desktop) */}
              {user.isAdmin && (
                <Link
                  href="/events/new"
                  className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-studio-accent active:scale-[0.98] rounded-xl shadow-xs transition-all"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>New Shoot</span>
                </Link>
              )}

              {/* User Avatar & Logout */}
              <div className="hidden sm:flex items-center gap-2.5 pl-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-studio-accent text-white font-bold text-xs flex items-center justify-center shadow-2xs">
                    {user.username.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="text-left leading-tight">
                    <span className="text-xs font-bold text-slate-900 block truncate max-w-[100px]">
                      {user.username}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {user.isAdmin ? "Studio Admin" : "Photographer"}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => logoutAction()}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors ml-1"
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

              {/* Edge/Mobile Hamburger Menu Trigger */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors focus:outline-none"
                aria-label="Toggle Navigation Menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3.5 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 text-xs font-bold text-white bg-studio-accent rounded-xl shadow-xs transition-all"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Edge Device & Mobile Drawer */}
      {user && mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white/98 backdrop-blur-xl animate-in slide-in-from-top-2 duration-200">
          <div className="p-4 space-y-4 w-full">
            {/* User Details in Mobile Drawer */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-studio-accent text-white font-bold text-sm flex items-center justify-center">
                  {user.username.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">{user.username}</div>
                  <div className="text-[11px] text-slate-500">{user.email}</div>
                  <span className="inline-block mt-0.5 px-2 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    {user.isAdmin ? "Studio Administrator" : "Team Photographer"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => logoutAction()}
                className="p-2.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl border border-slate-200 bg-white transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile Search Box */}
            <div className="md:hidden">
              <NavSearchAutocomplete />
            </div>

            {/* Quick Action Button */}
            {user.isAdmin && (
              <Link
                href="/events/new"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 py-3 text-xs font-bold text-white bg-studio-accent rounded-xl shadow-xs transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create New Photoshoot</span>
              </Link>
            )}

            {/* Mobile Nav Links */}
            <div className="space-y-1 pt-1">
              <div className="px-3 pb-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                Studio Workspace
              </div>
              {mobileNavLinks.map((item) => {
                const Icon = item.icon;
                const active = isLinkActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition-all ${
                      active
                        ? "active-nav-theme text-white font-bold shadow-xs"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${active ? "text-white" : "text-slate-400"}`} />
                      <span>{item.label}</span>
                    </div>
                    <ChevronRight className={`w-3.5 h-3.5 ${active ? "text-white" : "text-slate-300"}`} />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
