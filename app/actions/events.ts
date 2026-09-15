"use server";

import { getCurrentUser, checkMemberActive } from "@/lib/auth/session";
import {
  createEvent,
  updateEvent,
  updateEventStatus,
  deleteEvent,
  addEventMember,
  removeEventMember,
  cancelEvent,
  rescheduleEvent,
  startShootNow,
  completeShootNow,
} from "@/lib/db/events";
import { findUserById } from "@/lib/db/users";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type { EventStatus } from "@/types/database";
import { generatePublicEventCode } from "@/lib/utils/eventStatus";

export interface EventActionResult {
  success?: boolean;
  error?: string;
  eventId?: number;
}

export async function createEventAction(formData: FormData): Promise<EventActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "You must be signed in to create an event." };
  }

  const statusCheck = checkMemberActive(user);
  if (!statusCheck.allowed) {
    return { error: statusCheck.error };
  }

  const name = (formData.get("name") as string || "").trim();
  const category = (formData.get("category") as string || "Wedding").trim();
  const clientName = (formData.get("client_name") as string || "").trim();
  const clientEmail = (formData.get("client_email") as string || "").trim();
  const clientPhone = (formData.get("client_phone") as string || "").trim();
  const description = (formData.get("description") as string || "").trim();
  const eventDate = (formData.get("event_date") as string || "").trim();
  const startTime = (formData.get("start_time") as string || "").trim();
  const endTime = (formData.get("end_time") as string || "").trim();
  const location = (formData.get("location") as string || "").trim();
  const venueAddress = (formData.get("venue_address") as string || "").trim();
  const membersRaw = formData.getAll("members") as string[];

  let coverImage = (formData.get("cover_image_url") as string || "").trim();
  const coverFile = formData.get("cover_file") as File | null;

  if (!name) {
    return { error: "Event name is required." };
  }

  // If user uploaded a thumbnail file, store it in Supabase Storage
  if (coverFile && coverFile.size > 0 && coverFile.name) {
    try {
      const supabase = createAdminClient();
      const bucketName = process.env.SUPABASE_STORAGE_BUCKET || "trizenai-photo-sharing";
      const ext = coverFile.name.split(".").pop() || "jpg";
      const filename = `covers/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
      const buffer = Buffer.from(await coverFile.arrayBuffer());

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from(bucketName)
        .upload(filename, buffer, {
          contentType: coverFile.type || "image/jpeg",
          upsert: true,
        });

      if (!uploadErr && uploadData) {
        const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(filename);
        if (publicUrlData?.publicUrl) {
          coverImage = publicUrlData.publicUrl;
        }
      }
    } catch (e) {
      console.warn("Cover image upload to Supabase storage fallback:", e);
    }
  }

  // Public Event Code Format: RANDOM(6) + YYYY + RANDOM(3) (e.g. A7K9PQ2026X3M)
  const slug = generatePublicEventCode(eventDate);

  try {
    const event = await createEvent({
      name,
      slug,
      category,
      clientName,
      clientEmail,
      clientPhone,
      description,
      eventDate: eventDate || undefined,
      startTime,
      endTime,
      location,
      venueAddress,
      coverImage,
      createdById: user.id,
    });

    // Add selected team members
    for (const mId of membersRaw) {
      const parsedId = parseInt(mId, 10);
      if (!isNaN(parsedId)) {
        await addEventMember(event.id, parsedId);
      }
    }

    revalidatePath("/events");
    if (user.profile?.dashboard_token) {
      revalidatePath(`/dashboard/admin/${user.profile.dashboard_token}`);
    }
    revalidatePath("/dashboard/admin");
    return { success: true, eventId: event.id };
  } catch (err: any) {
    console.error("Create event error:", err);
    return { error: err.message || "Failed to create event." };
  }
}

export async function updateEventAction(eventId: number, formData: FormData): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const statusCheck = checkMemberActive(user);
  if (!statusCheck.allowed) {
    return { success: false, error: statusCheck.error };
  }

  const name = (formData.get("name") as string || "").trim();
  const category = (formData.get("category") as string || "Wedding").trim();
  const clientName = (formData.get("client_name") as string || "").trim();
  const clientEmail = (formData.get("client_email") as string || "").trim();
  const clientPhone = (formData.get("client_phone") as string || "").trim();
  const description = (formData.get("description") as string || "").trim();
  const eventDate = (formData.get("event_date") as string || "").trim();
  const startTime = (formData.get("start_time") as string || "").trim();
  const endTime = (formData.get("end_time") as string || "").trim();
  const location = (formData.get("location") as string || "").trim();
  const venueAddress = (formData.get("venue_address") as string || "").trim();

  try {
    await updateEvent(eventId, {
      name: name || undefined,
      category,
      clientName,
      clientEmail,
      clientPhone,
      description,
      eventDate: eventDate || undefined,
      startTime,
      endTime,
      location,
      venueAddress,
    });

    revalidatePath(`/events/${eventId}`);
    revalidatePath("/events");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteEventAction(eventId: number): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const statusCheck = checkMemberActive(user);
  if (!statusCheck.allowed) {
    return { success: false, error: statusCheck.error };
  }

  try {
    await deleteEvent(eventId);
    revalidatePath("/events");
    revalidatePath("/dashboard/admin");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function toggleEventMemberAction(
  eventId: number,
  userId: number,
  isAssigned: boolean
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const statusCheck = checkMemberActive(user);
  if (!statusCheck.allowed) {
    return { success: false, error: statusCheck.error };
  }

  // Check target user immunity
  const targetMember = await findUserById(userId);
  if (targetMember) {
    const isTargetAdmin = Boolean(
      targetMember.is_superuser ||
      targetMember.profile?.role === "ADMIN" ||
      targetMember.profile?.role === "CO_ADMIN"
    );
    if (!isAssigned && isTargetAdmin) {
      return { success: false, error: "Studio Administrators cannot be removed from photoshoot events." };
    }
  }

  try {
    if (isAssigned) {
      await addEventMember(eventId, userId);
    } else {
      await removeEventMember(eventId, userId);
    }
    revalidatePath(`/events/${eventId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateEventStatusAction(
  eventId: number,
  status: EventStatus
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const statusCheck = checkMemberActive(user);
  if (!statusCheck.allowed) {
    return { success: false, error: statusCheck.error };
  }

  try {
    await updateEventStatus(eventId, status);
    revalidatePath(`/events/${eventId}`);
    revalidatePath("/events");
    revalidatePath("/dashboard/team");
    revalidatePath("/dashboard/admin");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function cancelEventAction(
  eventId: number,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const statusCheck = checkMemberActive(user);
  if (!statusCheck.allowed) {
    return { success: false, error: statusCheck.error };
  }

  if (!reason || !reason.trim()) {
    return { success: false, error: "Cancellation reason is required." };
  }

  try {
    await cancelEvent(eventId, reason.trim(), user.id);
    revalidatePath(`/events/${eventId}`);
    revalidatePath("/events");
    revalidatePath("/dashboard/team");
    revalidatePath("/dashboard/admin");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function rescheduleEventAction(
  eventId: number,
  eventDate: string,
  startTime: string,
  endTime: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const statusCheck = checkMemberActive(user);
  if (!statusCheck.allowed) {
    return { success: false, error: statusCheck.error };
  }

  if (!eventDate || !eventDate.trim()) {
    return { success: false, error: "New event date is required for rescheduling." };
  }

  try {
    await rescheduleEvent(eventId, eventDate, startTime, endTime, reason);
    revalidatePath(`/events/${eventId}`);
    revalidatePath("/events");
    revalidatePath("/dashboard/team");
    revalidatePath("/dashboard/admin");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function startShootNowAction(
  eventId: number
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const statusCheck = checkMemberActive(user);
  if (!statusCheck.allowed) {
    return { success: false, error: statusCheck.error };
  }

  try {
    await startShootNow(eventId);
    revalidatePath(`/events/${eventId}`);
    revalidatePath("/events");
    revalidatePath("/dashboard/team");
    revalidatePath("/dashboard/admin");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function completeShootNowAction(
  eventId: number
): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const statusCheck = checkMemberActive(user);
  if (!statusCheck.allowed) {
    return { success: false, error: statusCheck.error };
  }

  try {
    await completeShootNow(eventId);
    revalidatePath(`/events/${eventId}`);
    revalidatePath("/events");
    revalidatePath("/dashboard/team");
    revalidatePath("/dashboard/admin");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
