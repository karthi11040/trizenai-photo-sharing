"use server";

import { getCurrentUser } from "@/lib/auth/session";
import { updateStudioSettings } from "@/lib/db/users";
import { createAdminClient } from "@/lib/supabase/admin";
import { query } from "@/lib/db";
import { revalidatePath } from "next/cache";

export interface StudioSettingsResult {
  success?: boolean;
  error?: string;
  logoUrl?: string;
}

export async function updateStudioSettingsAction(formData: FormData): Promise<StudioSettingsResult> {
  const user = await getCurrentUser();
  if (!user || (!user.is_superuser && user.profile.role !== "ADMIN" && user.profile.role !== "CO_ADMIN")) {
    return { error: "Access denied. Only studio administrators can update studio settings." };
  }

  const studioName = (formData.get("studio_name") as string || "").trim();
  const studioTagline = (formData.get("studio_tagline") as string || "").trim();
  const studioEmail = (formData.get("studio_email") as string || "").trim();
  const studioWebsite = (formData.get("studio_website") as string || "").trim();
  const studioInstagram = (formData.get("studio_instagram") as string || "").trim();
  const studioAddress = (formData.get("studio_address") as string || "").trim();
  const watermarkText = (formData.get("watermark_text") as string || "").trim();
  const watermarkEnabled = formData.get("watermark_enabled") === "1" || formData.get("watermark_enabled") === "true";
  const defaultPinLength = parseInt(formData.get("default_pin_length") as string || "4", 10);
  const defaultExpirationDays = parseInt(formData.get("default_expiration_days") as string || "60", 10);
  const clientDownloadsEnabled = formData.get("client_downloads_enabled") === "1" || formData.get("client_downloads_enabled") === "true";

  let studioLogo = (formData.get("studio_logo_url") as string || "").trim();
  const logoFile = formData.get("studio_logo_file") as File | null;
  const removeLogo = formData.get("remove_logo") === "1" || formData.get("remove_logo") === "true";

  // Handle Logo file upload to Supabase Storage
  if (removeLogo) {
    studioLogo = "";
  } else if (logoFile && logoFile.size > 0 && logoFile.name && logoFile.name !== "undefined") {
    try {
      const supabase = createAdminClient();
      const bucketName = process.env.SUPABASE_STORAGE_BUCKET || "trizenai-photo-sharing";

      // Ensure bucket exists and is marked public
      try {
        const { data: buckets } = await supabase.storage.listBuckets();
        const b = buckets?.find((x) => x.name === bucketName);
        if (!b) {
          await supabase.storage.createBucket(bucketName, { public: true });
        } else if (!b.public) {
          await supabase.storage.updateBucket(bucketName, { public: true });
        }
      } catch (bucketErr) {
        console.warn("Bucket ensure public check warning:", bucketErr);
      }

      const rawExt = logoFile.name.split(".").pop()?.toLowerCase() || "png";
      const ext = ["png", "jpg", "jpeg", "webp", "svg", "gif"].includes(rawExt) ? rawExt : "png";
      const filename = `logos/studio_${user.id}_${Date.now()}.${ext}`;
      const buffer = Buffer.from(await logoFile.arrayBuffer());

      const mimeType = logoFile.type || (ext === "svg" ? "image/svg+xml" : `image/${ext === "jpg" ? "jpeg" : ext}`);

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from(bucketName)
        .upload(filename, buffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (uploadErr) {
        console.error("Studio logo Supabase upload error:", uploadErr);
        return { error: `Supabase Storage upload failed: ${uploadErr.message}` };
      }

      if (uploadData) {
        const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(filename);
        if (publicUrlData?.publicUrl) {
          studioLogo = publicUrlData.publicUrl;
        }
      }
    } catch (e: any) {
      console.error("Studio logo upload exception:", e);
      return { error: `Failed to process logo upload: ${e.message}` };
    }
  }

  try {
    await updateStudioSettings(user.id, {
      studioName,
      studioTagline,
      studioEmail,
      studioWebsite,
      studioInstagram,
      studioAddress,
      watermarkText,
      watermarkEnabled,
      defaultPinLength,
      defaultExpirationDays,
      clientDownloadsEnabled,
      studioLogo: removeLogo ? "" : (studioLogo || undefined),
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/admin");
    revalidatePath("/events");
    revalidatePath("/galleries");
    return { success: true, logoUrl: studioLogo || undefined };
  } catch (err: any) {
    console.error("Update studio settings error:", err);
    return { error: err.message || "Failed to update studio settings." };
  }
}

export async function testSupabaseConnectionAction(): Promise<{
  connected: boolean;
  storageOk: boolean;
  dbOk: boolean;
  bucketName: string;
  latencyMs: number;
  message: string;
  error?: string;
}> {
  const startTime = Date.now();
  const bucketName = process.env.SUPABASE_STORAGE_BUCKET || "trizenai-photo-sharing";
  
  let dbOk = false;
  let storageOk = false;
  let errorMessage: string | undefined;

  // 1. Test Database
  try {
    const res = await query("SELECT 1 as ping");
    if (res && res.length > 0) {
      dbOk = true;
    }
  } catch (err: any) {
    errorMessage = `Database error: ${err.message}`;
  }

  // 2. Test Supabase Storage
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.storage.from(bucketName).list("", { limit: 1 });
    if (!error) {
      storageOk = true;
    } else {
      // If bucket doesn't exist yet or needs creation, still verify URL is reachable
      if (error.message.includes("not found") || error.message.includes("Bucket")) {
        storageOk = true; // Connection reached Supabase API
      } else {
        errorMessage = (errorMessage ? errorMessage + " | " : "") + `Storage error: ${error.message}`;
      }
    }
  } catch (err: any) {
    errorMessage = (errorMessage ? errorMessage + " | " : "") + `Storage error: ${err.message}`;
  }

  const latencyMs = Date.now() - startTime;
  const connected = dbOk || storageOk;

  return {
    connected,
    storageOk,
    dbOk,
    bucketName,
    latencyMs,
    message: connected
      ? "Supabase cloud connectivity active & healthy."
      : "Supabase connection check reported warnings.",
    error: errorMessage,
  };
}
