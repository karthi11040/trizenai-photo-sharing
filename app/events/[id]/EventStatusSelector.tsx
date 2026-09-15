"use client";

import { useState, useRef, useEffect } from "react";
import type { Event } from "@/types/database";
import { computeEventState } from "@/lib/utils/eventStatus";
import {
  startShootNowAction,
  completeShootNowAction,
  cancelEventAction,
  rescheduleEventAction,
} from "@/app/actions/events";
import { EventStatusBadge } from "@/components/events/EventStatusBadge";
import {
  ChevronDown,
  Play,
  CheckCircle2,
  XCircle,
  Calendar,
  Loader2,
  X,
  AlertTriangle,
  Clock,
  Sparkles,
} from "lucide-react";

interface EventStatusSelectorProps {
  event: Record<string, any>;
  isAdmin?: boolean;
}

export function EventStatusSelector({ event, isAdmin = true }: EventStatusSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Modal States
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(
    event.event_date ? new Date(event.event_date).toISOString().split("T")[0] : ""
  );
  const [rescheduleStartTime, setRescheduleStartTime] = useState(event.start_time || "10:00");
  const [rescheduleEndTime, setRescheduleEndTime] = useState(event.end_time || "18:00");
  const [rescheduleReason, setRescheduleReason] = useState("");

  const stateDetails = computeEventState(event);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Action Handlers
  const handleStartShootNow = async () => {
    setIsOpen(false);
    setIsUpdating(true);
    try {
      const res = await startShootNowAction(event.id!);
      if (!res.success) alert(res.error || "Failed to start shoot.");
    } catch (e: any) {
      alert(e.message || "An unexpected error occurred.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCompleteShootNow = async () => {
    setIsOpen(false);
    setIsUpdating(true);
    try {
      const res = await completeShootNowAction(event.id!);
      if (!res.success) alert(res.error || "Failed to complete shoot.");
    } catch (e: any) {
      alert(e.message || "An unexpected error occurred.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelReason.trim()) {
      alert("Please provide a reason for cancelling the shoot.");
      return;
    }
    setShowCancelModal(false);
    setIsUpdating(true);
    try {
      const res = await cancelEventAction(event.id!, cancelReason.trim());
      if (!res.success) alert(res.error || "Failed to cancel shoot.");
    } catch (err: any) {
      alert(err.message || "An unexpected error occurred.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleDate.trim()) {
      alert("Please select a new date for the shoot.");
      return;
    }
    setShowRescheduleModal(false);
    setIsUpdating(true);
    try {
      const res = await rescheduleEventAction(
        event.id!,
        rescheduleDate.trim(),
        rescheduleStartTime.trim(),
        rescheduleEndTime.trim(),
        rescheduleReason.trim()
      );
      if (!res.success) alert(res.error || "Failed to reschedule shoot.");
    } catch (err: any) {
      alert(err.message || "An unexpected error occurred.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Interactive Status Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={isUpdating}
        className="inline-flex items-center gap-1.5 p-1 hover:bg-slate-100 rounded-full transition-colors group cursor-pointer focus:outline-hidden"
        title="Shoot Status System (Auto-calculated with Admin Overrides)"
      >
        <EventStatusBadge event={event} showMediaStatus={true} size="md" />

        {isAdmin && (
          <div className="p-1 rounded-full text-slate-400 group-hover:text-slate-700 bg-white border border-slate-200 shadow-2xs">
            {isUpdating ? (
              <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
            ) : (
              <ChevronDown className="w-3 h-3 transition-transform group-hover:translate-y-0.5" />
            )}
          </div>
        )}
      </button>

      {/* Admin Control Dropdown */}
      {isOpen && isAdmin && (
        <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 w-64 bg-white rounded-2xl border border-slate-200/90 shadow-2xl z-50 p-2 space-y-1 animate-in fade-in-50 zoom-in-95 duration-150">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 flex items-center justify-between">
            <span>Admin Shoot Controls</span>
            <span className="text-slate-300 font-mono text-[9px]">STATE MACHINE</span>
          </div>

          {/* Action 1: Start Shoot Now */}
          {stateDetails.status !== "LIVE" && stateDetails.status !== "COMPLETED" && !stateDetails.isCancelled && (
            <button
              type="button"
              onClick={handleStartShootNow}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-900 rounded-xl transition-colors text-left"
            >
              <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                <Play className="w-3.5 h-3.5" />
              </div>
              <div>
                <span>Start Shoot Now</span>
                <span className="block text-[10px] text-slate-400 font-normal">Force shoot state to Live</span>
              </div>
            </button>
          )}

          {/* Action 2: Complete Shoot Now */}
          {stateDetails.status !== "COMPLETED" && !stateDetails.isCancelled && (
            <button
              type="button"
              onClick={handleCompleteShootNow}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 rounded-xl transition-colors text-left"
            >
              <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <div>
                <span>Complete Shoot Now</span>
                <span className="block text-[10px] text-slate-400 font-normal">Mark shoot as finished</span>
              </div>
            </button>
          )}

          {/* Action 3: Reschedule Event */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setShowRescheduleModal(true);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-sky-50 hover:text-sky-900 rounded-xl transition-colors text-left"
          >
            <div className="p-1.5 rounded-lg bg-sky-100 text-sky-700">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <div>
              <span>Reschedule Shoot</span>
              <span className="block text-[10px] text-slate-400 font-normal">Change date & start/end times</span>
            </div>
          </button>

          {/* Action 4: Cancel Shoot */}
          {!stateDetails.isCancelled && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setShowCancelModal(true);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors text-left border-t border-slate-100 pt-2 mt-1"
            >
              <div className="p-1.5 rounded-lg bg-red-100 text-red-700">
                <XCircle className="w-3.5 h-3.5" />
              </div>
              <div>
                <span>Cancel Shoot Event</span>
                <span className="block text-[10px] text-red-400 font-normal">Mark shoot as cancelled</span>
              </div>
            </button>
          )}
        </div>
      )}

      {/* MODAL 1: Cancel Shoot Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Cancel Photoshoot Event?</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Are you sure you want to cancel <strong className="text-slate-800">{event.name}</strong>? This shoot status will be changed to <span className="font-bold text-red-600">CANCELLED</span>. You can reschedule it later if needed.
            </p>

            <form onSubmit={handleConfirmCancel} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Cancellation Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Client requested cancellation due to weather forecast..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-slate-900 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Keep Event
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Cancel Shoot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Reschedule Shoot Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Reschedule Shoot Event</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRescheduleModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Select new date and time for <strong className="text-slate-800">{event.name}</strong>. Rescheduling will reset the status back to <span className="font-bold text-sky-600">UPCOMING SHOOT</span>.
            </p>

            <form onSubmit={handleConfirmReschedule} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  New Event Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-slate-900 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={rescheduleStartTime}
                    onChange={(e) => setRescheduleStartTime(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-slate-900 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={rescheduleEndTime}
                    onChange={(e) => setRescheduleEndTime(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-slate-900 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reschedule Notes / Reason</label>
                <input
                  type="text"
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="e.g. Moved to next week by client request..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-slate-900 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRescheduleModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[var(--studio-accent,#0f172a)] hover:bg-[var(--studio-accent-hover,#1e293b)] text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Confirm Reschedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
