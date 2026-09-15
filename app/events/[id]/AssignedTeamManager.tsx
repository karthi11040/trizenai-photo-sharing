"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Users, UserPlus, Check, X, Shield, Search, Sparkles, User as UserIcon } from "lucide-react";
import { toggleEventMemberAction } from "@/app/actions/events";
import type { UserWithProfile } from "@/lib/db/users";
import type { User } from "@/types/database";

interface AssignedTeamManagerProps {
  eventId: number;
  initialAssignedMembers: User[];
  allActiveTeamMembers: UserWithProfile[];
  isAdmin: boolean;
}

export function AssignedTeamManager({
  eventId,
  initialAssignedMembers,
  allActiveTeamMembers,
  isAdmin,
}: AssignedTeamManagerProps) {
  const [assignedMembers, setAssignedMembers] = useState<User[]>(initialAssignedMembers);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filter candidate members to ONLY active members or admins
  const activeCandidates = allActiveTeamMembers.filter((m) => {
    const isMemberAdmin = Boolean(m.is_superuser || m.profile?.role === "ADMIN" || m.profile?.role === "CO_ADMIN");
    const isActive = m.profile?.status === "ACTIVE" || m.profile?.status === undefined;
    return isMemberAdmin || isActive;
  });

  const filteredCandidates = activeCandidates.filter((m) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    const name = `${m.first_name || ""} ${m.last_name || ""}`.toLowerCase();
    return name.includes(q) || m.username.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
  });

  async function handleToggleMember(candidate: UserWithProfile) {
    const isCandidateAdmin = Boolean(
      candidate.is_superuser ||
      candidate.profile?.role === "ADMIN" ||
      candidate.profile?.role === "CO_ADMIN"
    );

    const currentlyAssigned = assignedMembers.some((m) => m.id === candidate.id);
    
    // Admins are permanently assigned and cannot be removed
    if (currentlyAssigned && isCandidateAdmin) {
      return;
    }

    const nextState = !currentlyAssigned;
    setError(null);
    setTogglingId(candidate.id);

    // 1. Instant Optimistic UI Update (No page reload required!)
    if (nextState) {
      setAssignedMembers((prev) => [
        ...prev,
        {
          id: candidate.id,
          username: candidate.username,
          email: candidate.email,
          first_name: candidate.first_name,
          last_name: candidate.last_name,
        },
      ]);
    } else {
      setAssignedMembers((prev) => prev.filter((m) => m.id !== candidate.id));
    }

    // 2. Server Action Update
    const res = await toggleEventMemberAction(eventId, candidate.id, nextState);
    setTogglingId(null);

    // 3. Rollback if server returns error
    if (!res.success) {
      setError(res.error || "Failed to update team member assignment.");
      if (nextState) {
        setAssignedMembers((prev) => prev.filter((m) => m.id !== candidate.id));
      } else {
        setAssignedMembers((prev) => [
          ...prev,
          {
            id: candidate.id,
            username: candidate.username,
            email: candidate.email,
            first_name: candidate.first_name,
            last_name: candidate.last_name,
          },
        ]);
      }
    }
  }

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-900">Assigned Team</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200/60">
            {assignedMembers.length}
          </span>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] rounded-lg transition-all flex items-center gap-1 cursor-pointer border border-indigo-100"
            >
              <UserPlus className="w-3 h-3" />
              <span>Manage</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-2 bg-red-50 border border-red-100 rounded-lg text-[11px] text-red-600 font-medium">
          {error}
        </div>
      )}

      {/* Currently Assigned List */}
      {assignedMembers.length === 0 ? (
        <div className="p-3 bg-slate-50/70 rounded-xl border border-dashed border-slate-200 text-center space-y-1">
          <Users className="w-5 h-5 text-slate-300 mx-auto" />
          <p className="text-[11px] text-slate-400 italic">No photographers assigned.</p>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
            >
              + Assign active members
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
          {assignedMembers.map((m) => {
            const displayName = `${m.first_name || ""} ${m.last_name || ""}`.trim() || m.username;
            return (
              <div
                key={m.id}
                className="p-2 rounded-lg bg-slate-50/80 flex items-center justify-between text-xs font-medium border border-slate-200/60"
              >
                <div className="flex items-center gap-2 truncate">
                  <div className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                    {displayName.substring(0, 2).toUpperCase()}
                  </div>
                  <span className="font-bold text-slate-900 truncate text-[11px]">{displayName}</span>
                </div>
                <span className="text-[9px] text-slate-400 font-mono truncate max-w-[110px]">{m.email}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ASSIGN TEAM MODAL (Admin Only) */}
      {isModalOpen && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[99999] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Manage Event Photographers</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Active Only
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Assign or remove photographers. Admins are permanently assigned.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search active team members..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all font-medium"
              />
            </div>

            {/* Candidates List */}
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
              {filteredCandidates.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 italic">
                  No active team members found.
                </div>
              ) : (
                filteredCandidates.map((candidate) => {
                  const isAssigned = assignedMembers.some((m) => m.id === candidate.id);
                  const isToggling = togglingId === candidate.id;
                  const isCandidateAdmin = Boolean(
                    candidate.is_superuser ||
                    candidate.profile?.role === "ADMIN" ||
                    candidate.profile?.role === "CO_ADMIN"
                  );
                  const displayName = `${candidate.first_name || ""} ${candidate.last_name || ""}`.trim() || candidate.username;

                  return (
                    <div
                      key={candidate.id}
                      onClick={() => !isCandidateAdmin && handleToggleMember(candidate)}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                        isCandidateAdmin
                          ? "bg-purple-50/70 border-purple-200 cursor-not-allowed"
                          : isAssigned
                          ? "bg-indigo-50/90 border-indigo-600 ring-1 ring-indigo-600/30 cursor-pointer"
                          : "bg-slate-50/60 border-slate-200/80 hover:bg-slate-100 cursor-pointer"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {displayName.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                            <span>{displayName}</span>
                            {isCandidateAdmin ? (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                Studio Admin
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">@{candidate.username} &bull; {candidate.email}</div>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all shrink-0 ${
                          isCandidateAdmin
                            ? "bg-purple-600 border-purple-600 text-white opacity-80"
                            : isAssigned
                            ? "bg-indigo-600 border-indigo-600 text-white"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {isToggling ? (
                          <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : isAssigned || isCandidateAdmin ? (
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
