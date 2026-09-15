"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  addTeamMemberAction,
  updateTeamMemberAction,
  deleteTeamMemberAction,
  TeamActionResult,
} from "@/app/actions/team";
import {
  Users,
  UserPlus,
  Shield,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  Edit2,
  Trash2,
  KeyRound,
  Mail,
  Phone,
  Copy,
  Check,
  X,
  ExternalLink,
  Sparkles,
  Camera,
  RefreshCw,
  Search,
  Info,
  ShieldAlert,
} from "lucide-react";
import type { UserWithProfile } from "@/lib/db/users";

export function TeamManagementClient({
  initialMembers,
  currentUserId,
}: {
  initialMembers: UserWithProfile[];
  currentUserId: number;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [members, setMembers] = useState(initialMembers);
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<UserWithProfile | null>(null);
  const [editSelectedRole, setEditSelectedRole] = useState<string>("TEAM_MEMBER");
  const [deletingMember, setDeletingMember] = useState<UserWithProfile | null>(null);
  const [inviteResult, setInviteResult] = useState<TeamActionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  function handleOpenEditModal(m: UserWithProfile) {
    setEditingMember(m);
    setEditSelectedRole(m.profile?.role || "TEAM_MEMBER");
  }

  // ESC Key listener to close all modals and prevent background scrolling
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (!loading) {
          setIsAddOpen(false);
          setEditingMember(null);
          setDeletingMember(null);
          setInviteResult(null);
        }
      }
    }

    const isAnyModalOpen = isAddOpen || !!editingMember || !!deletingMember || !!inviteResult;
    if (isAnyModalOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isAddOpen, editingMember, deletingMember, inviteResult, loading]);

  // Filter members by search term
  const filteredMembers = members.filter((m) => {
    const fullName = `${m.first_name || ""} ${m.last_name || ""}`.toLowerCase();
    const query = search.toLowerCase();
    return (
      fullName.includes(query) ||
      m.username.toLowerCase().includes(query) ||
      m.email.toLowerCase().includes(query) ||
      (m.profile?.role || "").toLowerCase().includes(query)
    );
  });

  function copyToClipboard(text: string, fieldId: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  }

  async function handleAddMember(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const res = await addTeamMemberAction(formData);

    setLoading(false);
    if (res.error) {
      setError(res.error);
    } else {
      setIsAddOpen(false);
      setInviteResult(res);
      router.refresh();
    }
  }

  async function handleUpdateMember(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingMember) return;
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const res = await updateTeamMemberAction(editingMember.id, formData);

    setLoading(false);
    if (res.error) {
      setError(res.error);
    } else {
      setEditingMember(null);
      router.refresh();
    }
  }

  async function handleDeleteMember() {
    if (!deletingMember) return;
    setLoading(true);

    const res = await deleteTeamMemberAction(deletingMember.id);
    setLoading(false);

    if (res.error) {
      alert(res.error);
    } else {
      setDeletingMember(null);
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Team Management</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
              {filteredMembers.length} Members
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage studio photographers, assign roles, create one-time access credentials, and monitor roster permissions.
          </p>
        </div>

        <button
          onClick={() => {
            setError(null);
            setIsAddOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-studio-accent active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-xs transition-all"
        >
          <UserPlus className="w-4 h-4" />
          <span>Invite Team Member</span>
        </button>
      </div>

      {/* Search & Filter bar */}
      <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            suppressHydrationWarning
            placeholder="Search by name, email, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="p-4 sm:px-6">Member Profile</th>
                <th className="p-4 sm:px-6">Role</th>
                <th className="p-4 sm:px-6">Status & Password</th>
                <th className="p-4 sm:px-6">Contact Details</th>
                <th className="p-4 sm:px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredMembers.map((m) => {
                const displayName = `${m.first_name || ""} ${m.last_name || ""}`.trim() || m.username;
                const isSelf = m.id === currentUserId;
                const role = m.profile?.role || (m.is_superuser ? "ADMIN" : "TEAM_MEMBER");
                const mustChange = m.profile?.must_change_password;

                return (
                  <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs uppercase shadow-2xs">
                          {displayName.substring(0, 2)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{displayName}</span>
                            {isSelf && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-600">
                                You
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400">@{m.username}</span>
                        </div>
                      </div>
                    </td>

                    <td className="p-4 sm:px-6">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        <Shield className="w-3 h-3" />
                        {role === "ADMIN" ? "Studio Admin" : role === "CO_ADMIN" ? "Co-Admin" : "Photographer"}
                      </span>
                    </td>

                    <td className="p-4 sm:px-6">
                      <div className="space-y-1">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            m.profile?.status === "SUSPENDED"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : m.profile?.status === "INACTIVE" || m.profile?.status === "PENDING"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}
                        >
                          {m.profile?.status === "SUSPENDED" ? (
                            <ShieldAlert className="w-3 h-3 text-red-600" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3" />
                          )}
                          {m.profile?.status || "ACTIVE"}
                        </span>
                        {mustChange && (
                          <div className="text-[10px] text-amber-600 font-semibold flex items-center gap-1">
                            <KeyRound className="w-3 h-3" />
                            One-Time Credential
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="p-4 sm:px-6 text-slate-600 space-y-0.5">
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{m.email}</span>
                      </div>
                      {m.profile?.phone_number && (
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Phone className="w-3 h-3 shrink-0" />
                          <span>{m.profile.phone_number}</span>
                        </div>
                      )}
                    </td>

                    <td className="p-4 sm:px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditModal(m)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit member"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {!isSelf && (
                          <button
                            onClick={() => setDeletingMember(m)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove member"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Invite / Add Team Member */}
      {mounted && isAddOpen && createPortal(
        <div className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 sm:p-8 space-y-6 shadow-xl relative">
            <button
              onClick={() => setIsAddOpen(false)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">Invite New Team Member</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700">
                  One-Time Key
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Generates a single-use login credential. The member will be prompted to set a permanent password upon first login.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleAddMember} method="POST" className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    name="first_name"
                    required
                    suppressHydrationWarning
                    placeholder="Marcus"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    name="last_name"
                    suppressHydrationWarning
                    placeholder="Vance"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  suppressHydrationWarning
                  placeholder="marcus@trizenai.studio"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  suppressHydrationWarning
                  placeholder="+91 98765 43210"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Assigned Studio Role
                </label>
                <select
                  name="role"
                  defaultValue="TEAM_MEMBER"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all font-medium"
                >
                  <option value="TEAM_MEMBER">Photographer / Shooter</option>
                  <option value="CO_ADMIN">Co-Admin (Can manage events)</option>
                  <option value="ADMIN">Full Studio Admin</option>
                </select>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800">Send Invitation Email</div>
                  <div className="text-[10px] text-slate-500">Delivers credentials via Gmail SMTP</div>
                </div>
                <input
                  type="checkbox"
                  name="send_email"
                  defaultChecked
                  className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loading ? "Generating Credentials..." : "Generate One-Time Invite"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 2: Invite Success & Credentials Display */}
      {mounted && inviteResult && createPortal(
        <div className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 sm:p-8 space-y-6 shadow-xl relative">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Team Member Invited!</h3>
              <p className="text-xs text-slate-500">
                One-time credentials generated for <strong className="text-slate-800">{inviteResult.memberName}</strong> ({inviteResult.memberEmail}).
              </p>
            </div>

            {/* Credential Card */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  One-Time Temporary Password
                </span>
                <button
                  onClick={() => copyToClipboard(inviteResult.temporaryPassword || "", "password")}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                >
                  {copiedField === "password" ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Password</span>
                    </>
                  )}
                </button>
              </div>
              <div className="p-2.5 bg-white border border-slate-200 rounded-xl font-mono text-sm font-bold text-indigo-700 select-all">
                {inviteResult.temporaryPassword}
              </div>

              <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Activation Login URL
                </span>
                <button
                  onClick={() => copyToClipboard(inviteResult.activationUrl || "", "url")}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                >
                  {copiedField === "url" ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
              <div className="p-2 bg-white border border-slate-200 rounded-xl text-[11px] text-slate-600 truncate font-mono select-all">
                {inviteResult.activationUrl}
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 space-y-1">
              <span className="font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" /> One-Time Security Enforcement:
              </span>
              <p>The member will be forced to change this temporary password immediately after first login.</p>
            </div>

            <button
              onClick={() => setInviteResult(null)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              Done & Return to Roster
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 3: Edit Member */}
      {mounted && editingMember && createPortal(
        <div className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 sm:p-8 space-y-6 shadow-xl relative">
            <button
              onClick={() => setEditingMember(null)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-bold text-slate-900">Edit Team Member</h3>
              <p className="text-xs text-slate-500 mt-1">
                Update details for @{editingMember.username}
              </p>
            </div>

            <form onSubmit={handleUpdateMember} method="POST" className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    name="first_name"
                    defaultValue={editingMember.first_name || ""}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    name="last_name"
                    defaultValue={editingMember.last_name || ""}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  defaultValue={editingMember.email}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  defaultValue={editingMember.profile?.phone_number || ""}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all"
                />
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Studio Role
                    </label>
                    <select
                      name="role"
                      value={editSelectedRole}
                      onChange={(e) => setEditSelectedRole(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all font-medium cursor-pointer"
                    >
                      <option value="TEAM_MEMBER">Photographer</option>
                      <option value="CO_ADMIN">Co-Admin</option>
                      <option value="ADMIN">Studio Admin</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Account Status
                    </label>
                    {(() => {
                      const isRoleAdmin = editSelectedRole === "ADMIN" || editSelectedRole === "CO_ADMIN" || editingMember.is_superuser;
                      return (
                        <select
                          name="status"
                          defaultValue={isRoleAdmin && editingMember.profile?.status === "SUSPENDED" ? "ACTIVE" : (editingMember.profile?.status || "ACTIVE")}
                          className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all font-medium cursor-pointer"
                        >
                          <option value="ACTIVE">Active</option>
                          <option value="SUSPENDED" disabled={isRoleAdmin}>
                            {isRoleAdmin ? "Suspended (Admins Cannot Be Suspended)" : "Suspended"}
                          </option>
                          <option value="INACTIVE">Inactive</option>
                        </select>
                      );
                    })()}
                  </div>
                </div>

                {(editSelectedRole === "ADMIN" || editSelectedRole === "CO_ADMIN" || editingMember.is_superuser) && (
                  <div className="p-2.5 bg-indigo-50/70 border border-indigo-100 rounded-xl text-[11px] text-indigo-800 flex items-center gap-2">
                    <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>Studio Administrators & Co-Admins are immune to account suspension.</span>
                  </div>
                )}
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-amber-900">Reset Credentials</div>
                  <div className="text-[10px] text-amber-700">Issue new one-time temporary password</div>
                </div>
                <input
                  type="checkbox"
                  name="reset_password"
                  value="true"
                  className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loading ? "Saving Changes..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 4: Delete Confirmation */}
      {mounted && deletingMember && createPortal(
        <div className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-sm w-full p-6 text-center space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center mx-auto shadow-xs">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Remove Team Member?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to remove <strong className="text-slate-800">{deletingMember.first_name} {deletingMember.last_name || ""}</strong> (@{deletingMember.username})? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingMember(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteMember}
                disabled={loading}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Removing..." : "Yes, Remove"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
