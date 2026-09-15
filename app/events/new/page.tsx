import { getCurrentUser } from "@/lib/auth/session";
import { getAllTeamMembers } from "@/lib/db/users";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { CreateEventForm } from "./CreateEventForm";

export default async function NewEventPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // Fetch team members for shooter assignment (ACTIVE members & admins only)
  const teamMembers = await getAllTeamMembers();
  const assignableMembers = teamMembers.filter((m) => {
    const isMemberAdmin = Boolean(m.is_superuser || m.profile?.role === "ADMIN" || m.profile?.role === "CO_ADMIN");
    const isActive = m.profile?.status === "ACTIVE" || m.profile?.status === undefined;
    return m.id !== user.id && (isMemberAdmin || isActive);
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/events"
            className="p-2.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded-xl border border-slate-200/80 shadow-2xs transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create New Photoshoot</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                Wizard
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure event schedule, client information, shoot thumbnail, and assign studio photographers.
            </p>
          </div>
        </div>
      </div>

      <CreateEventForm teamMembers={assignableMembers} />
    </div>
  );
}
