"use server";

import { getCurrentUser, checkMemberActive } from "@/lib/auth/session";
import {
  createOrUpdateGallery,
  getGalleryBySlug,
  verifyPin,
  recordGalleryView,
  updateGalleryPhotoSelection,
} from "@/lib/db/galleries";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

export async function publishGalleryAction(formData: FormData): Promise<{ success: boolean; error?: string; slug?: string }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const isAdmin = user.is_superuser || user.profile?.role === "ADMIN" || user.profile?.role === "CO_ADMIN";
  if (!isAdmin) {
    return { success: false, error: "Access denied. Only Event Admins can manage gallery selections." };
  }

  const statusCheck = checkMemberActive(user);
  if (!statusCheck.allowed) {
    return { success: false, error: statusCheck.error };
  }

  const eventIdRaw = formData.get("event_id") as string;
  const title = (formData.get("title") as string || "").trim();
  const pin = (formData.get("pin") as string || "").trim();
  const photoIdsRaw = formData.getAll("photo_ids") as string[];

  if (!eventIdRaw || !title || !pin) {
    return { success: false, error: "Title, event, and 4-6 digit PIN are required." };
  }

  const eventId = parseInt(eventIdRaw, 10);
  const photoIds = photoIdsRaw.map((id) => parseInt(id, 10)).filter((id) => !isNaN(id));

  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "") + "-" + Math.random().toString(36).substring(2, 6);

  try {
    const gallery = await createOrUpdateGallery({
      eventId,
      title,
      slug,
      pin,
      photoIds,
    });

    revalidatePath("/galleries");
    revalidatePath(`/events/${eventId}`);
    return { success: true, slug: gallery.slug };
  } catch (err: any) {
    console.error("Gallery publish error:", err);
    return { success: false, error: err.message || "Failed to publish gallery." };
  }
}

export async function verifyGalleryPinAction(slug: string, enteredPin: string): Promise<{ success: boolean; sessionToken?: string; error?: string }> {
  if (!enteredPin || enteredPin.trim().length === 0) {
    return { success: false, error: "Please enter the security PIN." };
  }

  const gallery = await getGalleryBySlug(slug);
  if (!gallery) {
    return { success: false, error: "Gallery not found." };
  }

  const isValid = verifyPin(enteredPin, gallery.pin_hash);
  if (!isValid) {
    return { success: false, error: "Invalid PIN. Access denied." };
  }

  // Record telemetry view
  try {
    await recordGalleryView(gallery.id, "127.0.0.1", "Web Client", "Desktop/Mobile");
  } catch (err) {
    console.warn("Could not log gallery telemetry view:", err);
  }

  // Create temporary gallery session token (base64url hash)
  const sessionToken = crypto.randomBytes(24).toString("base64url");
  return { success: true, sessionToken };
}

export async function updateGallerySelectionAction(
  eventId: number,
  photoIds: number[]
): Promise<{ success: boolean; error?: string; noGallery?: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const isAdmin = user.is_superuser || user.profile?.role === "ADMIN" || user.profile?.role === "CO_ADMIN";
  if (!isAdmin) {
    return { success: false, error: "Access denied. Only Event Admins can manage gallery photo selection." };
  }

  const statusCheck = checkMemberActive(user);
  if (!statusCheck.allowed) return { success: false, error: statusCheck.error };

  try {
    const result = await updateGalleryPhotoSelection(eventId, photoIds);
    if (!result.updated) {
      return { success: false, noGallery: true, error: "No gallery exists for this event yet. Create a gallery PIN first." };
    }
    revalidatePath(`/events/${eventId}`);
    revalidatePath(`/events/${eventId}/photos`);
    return { success: true };
  } catch (err: any) {
    console.error("Gallery selection update error:", err);
    return { success: false, error: err.message || "Failed to update gallery selection." };
  }
}
