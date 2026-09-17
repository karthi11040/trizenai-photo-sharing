import type { Event } from "@/types/database";

export type ComputedEventStatus = "UPCOMING" | "LIVE" | "COMPLETED" | "CANCELLED";
export type MediaStatus = "NOT_APPLICABLE" | "UPLOAD_REQUIRED" | "IMAGES_AVAILABLE";

export interface EventStateDetails {
  status: ComputedEventStatus;
  mediaStatus: MediaStatus;
  statusLabel: string;
  mediaStatusLabel: string;
  isCancelled: boolean;
  startDateTime: Date | null;
  endDateTime: Date | null;
  actualStartedAt?: string | null;
  actualCompletedAt?: string | null;
  cancellationReason?: string | null;
}

/**
 * Generate a public event code in format: RANDOM(6) + YYYY + RANDOM(3)
 * Example: A7K9PQ2026X3M
 */
export function generatePublicEventCode(eventDate?: string): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const genRand = (len: number) =>
    Array.from({ length: len }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join("");

  const random6 = genRand(6);
  const year = eventDate && !isNaN(new Date(eventDate).getTime())
    ? new Date(eventDate).getFullYear().toString()
    : new Date().getFullYear().toString();
  const random3 = genRand(3);

  return `${random6}${year}${random3}`;
}

/**
 * Parses date + time string into a Date object.
 * e.g., dateStr = "2026-09-15", timeStr = "10:00" or "10:00:00"
 */
export function parseEventDateTime(dateStr?: string | null, timeStr?: string | null, defaultTime = "09:00"): Date | null {
  if (!dateStr) return null;

  try {
    const rawDatePart = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
    const cleanTime = (timeStr && timeStr.trim() ? timeStr.trim() : defaultTime);
    const combinedStr = `${rawDatePart}T${cleanTime.length === 5 ? cleanTime + ":00" : cleanTime}`;
    const d = new Date(combinedStr);
    return isNaN(d.getTime()) ? new Date(rawDatePart) : d;
  } catch (e) {
    return null;
  }
}

/**
 * State Machine Priority:
 * 1. IF event.cancelled / status == "CANCELLED" / "QUIT" -> CANCELLED
 * 2. IF manual override (actual_started_at / actual_completed_at / status == "STARTED" | "LIVE" | "COMPLETED")
 * 3. ELSE calculate automatically from current_datetime vs (start_datetime, end_datetime)
 */
export function computeEventState(event: Partial<Event> & Record<string, any>, nowInput?: Date): EventStateDetails {
  const now = nowInput || new Date();
  const rawStatus = (event.status || "").toUpperCase();

  // 1. Cancellation check
  const isCancelled =
    Boolean(event.is_cancelled) ||
    rawStatus === "CANCELLED" ||
    rawStatus === "QUIT" ||
    Boolean(event.cancelled_at);

  if (isCancelled) {
    const photosCount = event.photos_count || 0;
    return {
      status: "CANCELLED",
      mediaStatus: photosCount > 0 ? "IMAGES_AVAILABLE" : "NOT_APPLICABLE",
      statusLabel: "Shoot Cancelled",
      mediaStatusLabel: photosCount > 0 ? `Photos Available (${photosCount})` : "Cancelled",
      isCancelled: true,
      startDateTime: null,
      endDateTime: null,
      cancellationReason: event.cancellation_reason || null,
    };
  }

  // Parse start and end date times
  const startDateTime = parseEventDateTime(event.event_date, event.start_time, "09:00");
  let endDateTime = parseEventDateTime(event.event_date, event.end_time, "18:00");

  // Fallback end time: 8 hours after start time if start time exists
  if (startDateTime && (!endDateTime || endDateTime.getTime() <= startDateTime.getTime())) {
    endDateTime = new Date(startDateTime.getTime() + 8 * 60 * 60 * 1000);
  }

  let status: ComputedEventStatus = "UPCOMING";

  // Manual Overrides Check
  if (event.actual_completed_at || rawStatus === "COMPLETED") {
    status = "COMPLETED";
  } else if (event.actual_started_at || rawStatus === "STARTED" || rawStatus === "LIVE" || rawStatus === "ONGOING") {
    status = "LIVE";
  } else if (startDateTime && endDateTime) {
    // Automatic Date + Time State Machine
    if (now.getTime() < startDateTime.getTime()) {
      status = "UPCOMING";
    } else if (now.getTime() >= startDateTime.getTime() && now.getTime() < endDateTime.getTime()) {
      status = "LIVE";
    } else if (now.getTime() >= endDateTime.getTime()) {
      status = "COMPLETED";
    }
  }

  // Media Status Calculation
  const photosCount = event.photos_count || 0;
  let mediaStatus: MediaStatus = "NOT_APPLICABLE";
  let mediaStatusLabel = "";

  if (photosCount > 0) {
    mediaStatus = "IMAGES_AVAILABLE";
    mediaStatusLabel = `Photos Uploaded (${photosCount})`;
  } else if (status === "COMPLETED") {
    mediaStatus = "UPLOAD_REQUIRED";
    mediaStatusLabel = "Upload Images Required";
  } else {
    mediaStatus = "NOT_APPLICABLE";
    mediaStatusLabel = "Pending Shoot";
  }

  const statusLabels: Record<ComputedEventStatus, string> = {
    UPCOMING: "Upcoming Shoot",
    LIVE: "Live Shoot In Progress",
    COMPLETED: "Shoot Completed",
    CANCELLED: "Shoot Cancelled",
  };

  return {
    status,
    mediaStatus,
    statusLabel: statusLabels[status],
    mediaStatusLabel,
    isCancelled: false,
    startDateTime,
    endDateTime,
    actualStartedAt: event.actual_started_at || null,
    actualCompletedAt: event.actual_completed_at || null,
    cancellationReason: event.cancellation_reason || null,
  };
}
