"use server";

import { getCurrentUser, checkMemberActive } from "@/lib/auth/session";
import { createPhoto, deletePhoto } from "@/lib/db/photos";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function deletePhotoAction(photoId: number, eventId: number): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Unauthorized" };
  
  const statusCheck = checkMemberActive(user);
  if (!statusCheck.allowed) {
    return { success: false, error: statusCheck.error };
  }

  try {
    const success = await deletePhoto(photoId);
    if (success) {
      revalidatePath(`/events/${eventId}/photos`);
      revalidatePath(`/events/${eventId}`);
      return { success: true };
    }
    return { success: false, error: "Photo not found or already deleted." };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function uploadPhotoAction(formData: FormData): Promise<{ success: boolean; error?: string; photoId?: number }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Unauthorized" };
  
  const statusCheck = checkMemberActive(user);
  if (!statusCheck.allowed) {
    return { success: false, error: statusCheck.error };
  }

  const eventIdRaw = formData.get("event_id") as string;
  const file = formData.get("file") as File;
  const customDate = formData.get("custom_date") as string;

  if (!eventIdRaw || !file) {
    return { success: false, error: "Missing required photo data." };
  }

  const eventId = parseInt(eventIdRaw, 10);
  
  // Validate that upload date cannot be before the event date
  const { getEventById } = await import("@/lib/db/events");
  const event = await getEventById(eventId);
  if (event && event.event_date && customDate) {
    const eventDateStr = event.event_date.split("T")[0];
    const uploadDateStr = customDate.split("T")[0];
    if (uploadDateStr < eventDateStr) {
      return {
        success: false,
        error: `Upload date (${uploadDateStr}) cannot be earlier than the event date (${eventDateStr}).`,
      };
    }
  }

  const supabase = createAdminClient();
  const bucketName = process.env.SUPABASE_STORAGE_BUCKET || "event-photos";

  try {
    const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const eventNameClean = (event?.name || "shoot").toLowerCase().replace(/[^a-z0-9]+/g, "").replace(/(^_|_$)/g, "") || "shoot";
    const photoCount = (event?.photos_count || 0) + 1;
    const yearStr = event?.event_date ? new Date(event.event_date).getFullYear().toString() : new Date().getFullYear().toString();
    const random6 = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Format: {event name}{count}{year}{6 digit random}.{ext}
    const formattedFilename = `${eventNameClean}${photoCount}${yearStr}${random6}.${fileExt}`;
    const storagePath = `events/${eventId}/${formattedFilename}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(storagePath, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: true,
      });

    if (uploadError) {
      console.error("Supabase storage upload error:", uploadError);
      // Fallback path or proceed
    }

    // Preserve custom upload date or default to now
    const uploadTimestamp = customDate ? new Date(customDate).toISOString() : new Date().toISOString();

    const photo = await createPhoto({
      eventId,
      uploadedById: user.id,
      filename: formattedFilename,
      storagePath,
      fileSize: file.size,
      mimeType: file.type || "application/octet-stream",
      uploadedAt: uploadTimestamp,
    });

    revalidatePath(`/events/${eventId}/photos`);
    return { success: true, photoId: photo.id };
  } catch (err: any) {
    console.error("Upload photo error:", err);
    return { success: false, error: err.message || "Failed to upload photo." };
  }
}
