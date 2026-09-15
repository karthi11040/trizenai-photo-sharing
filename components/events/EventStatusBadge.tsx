"use client";

import type { Event, EventStatus } from "@/types/database";
import { computeEventState, type ComputedEventStatus } from "@/lib/utils/eventStatus";
import { Clock, Play, Radio, CheckCircle2, XCircle, UploadCloud, ImageIcon } from "lucide-react";

interface EventStatusBadgeProps {
  event?: Record<string, any>;
  status?: EventStatus | string;
  size?: "sm" | "md" | "lg";
  showMediaStatus?: boolean;
  className?: string;
}

export function EventStatusBadge({
  event,
  status: inputStatus,
  size = "md",
  showMediaStatus = false,
  className = "",
}: EventStatusBadgeProps) {
  // If event object provided, use state machine calculation
  const stateDetails = event
    ? computeEventState(event)
    : computeEventState({ status: (inputStatus || "UPCOMING") as EventStatus });

  const normStatus: ComputedEventStatus = stateDetails.status;

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-2.5 py-1 text-xs",
    lg: "px-3.5 py-1.5 text-sm",
  }[size];

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-3.5 h-3.5",
    lg: "w-4 h-4",
  }[size];

  const renderEventStatus = () => {
    switch (normStatus) {
      case "LIVE":
        return (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full font-bold uppercase tracking-wider bg-rose-50 text-rose-900 border border-rose-200/90 shadow-2xs ${sizeClasses} ${className}`}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
            </span>
            <Radio className={`${iconSizes} text-rose-600`} />
            <span>Live Shoot In Progress</span>
          </span>
        );

      case "COMPLETED":
        return (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full font-bold uppercase tracking-wider bg-emerald-50 text-emerald-900 border border-emerald-200/90 shadow-2xs ${sizeClasses} ${className}`}
          >
            <CheckCircle2 className={`${iconSizes} text-emerald-600`} />
            <span>Shoot Completed</span>
          </span>
        );

      case "CANCELLED":
        return (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs ${sizeClasses} ${className}`}
          >
            <XCircle className={`${iconSizes} text-slate-500`} />
            <span>Shoot Cancelled</span>
          </span>
        );

      case "UPCOMING":
      default:
        return (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full font-bold uppercase tracking-wider bg-sky-50 text-sky-900 border border-sky-200/90 shadow-2xs ${sizeClasses} ${className}`}
          >
            <Clock className={`${iconSizes} text-sky-600`} />
            <span>Upcoming Shoot</span>
          </span>
        );
    }
  };

  const renderMediaStatus = () => {
    if (!showMediaStatus || stateDetails.mediaStatus === "NOT_APPLICABLE") return null;

    if (stateDetails.mediaStatus === "UPLOAD_REQUIRED") {
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full font-bold uppercase tracking-wider bg-amber-50 text-amber-900 border border-amber-200/90 shadow-2xs ${sizeClasses}`}
        >
          <UploadCloud className={`${iconSizes} text-amber-600`} />
          <span>Upload Images Required</span>
        </span>
      );
    }

    if (stateDetails.mediaStatus === "IMAGES_AVAILABLE") {
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full font-bold uppercase tracking-wider bg-indigo-50 text-indigo-900 border border-indigo-200/90 shadow-2xs ${sizeClasses}`}
        >
          <ImageIcon className={`${iconSizes} text-indigo-600`} />
          <span>{stateDetails.mediaStatusLabel}</span>
        </span>
      );
    }

    return null;
  };

  return (
    <div className="inline-flex flex-wrap items-center gap-1.5">
      {renderEventStatus()}
      {renderMediaStatus()}
    </div>
  );
}
