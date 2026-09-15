import { getAllTeamMembers } from "@/lib/db/users";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { ShieldCheck, UserCheck, Mail } from "lucide-react";

export default async function AdministratorsPage() {
  const user = await getCurrentUser();
  if (!user || (!user.is_superuser && user.profile.role !== "ADMIN")) {
    redirect("/dashboard/team");
  }

  const allMembers = await getAllTeamMembers();
  const admins = allMembers.filter((m) => m.is_superuser || m.profile?.role === "ADMIN" || m.profile?.role === "CO_ADMIN");

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Studio Administrators</h1>
        <p className="text-sm text-slate-500 mt-1">
          Users with administrative control, shoot assignments, and client proofing access.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {admins.map((admin) => (
          <div
            key={admin.id}
            className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 hover:border-indigo-200 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                {admin.first_name?.[0] || admin.username[0]}
              </div>
              <div className="truncate">
                <h3 className="text-sm font-bold text-slate-900 truncate">
                  {admin.first_name ? `${admin.first_name} ${admin.last_name || ""}` : admin.username}
                </h3>
                <span className="text-xs text-slate-400 block truncate">{admin.email}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1 font-bold text-slate-800 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
                {admin.is_superuser ? "Super Admin" : "Co-Administrator"}
              </span>
              <span className="text-slate-400 text-[11px]">
                Active since {new Date(admin.date_joined || Date.now()).getFullYear()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
