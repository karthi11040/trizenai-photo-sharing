import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Resolves a storage path or raw URL to a fast CDN URL synchronously (0ms latency, 0 network calls).
 */
export function getFastStorageUrl(pathOrUrl: string | null | undefined): string | null {
  if (!pathOrUrl) return null;
  const trimmed = pathOrUrl.trim();
  if (!trimmed) return null;

  // If already a full HTTP/HTTPS URL or data URI, return immediately
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:")) {
    return trimmed;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const bucketName = process.env.SUPABASE_STORAGE_BUCKET || "trizenai-photo-sharing";

  if (supabaseUrl) {
    try {
      const supabase = createAdminClient();
      const { data } = supabase.storage.from(bucketName).getPublicUrl(trimmed);
      if (data?.publicUrl) {
        return data.publicUrl;
      }
    } catch {
      // Fallback
    }

    const cleanUrl = supabaseUrl.replace(/\/$/, "");
    const cleanPath = trimmed.replace(/^\//, "");
    return `${cleanUrl}/storage/v1/object/public/${bucketName}/${cleanPath}`;
  }

  return `/media/${trimmed}`;
}
