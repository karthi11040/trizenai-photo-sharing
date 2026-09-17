import { query, queryOne } from "./index";
import type { Photo, User } from "@/types/database";
import { createAdminClient } from "@/lib/supabase/admin";

export interface DayGroupedPhotos {
  date: string; // YYYY-MM-DD
  displayDate: string; // Formatted display date (e.g., September 8, 2026)
  photos: (Photo & { signedUrl?: string })[];
}

export async function getPhotosByEventId(eventId: number): Promise<Photo[]> {
  const photos = await query<Photo>(
    `SELECT p.*, u.username as uploader_username, u.first_name as uploader_first_name, u.last_name as uploader_last_name
     FROM photos_photo p
     LEFT JOIN auth_user u ON u.id = p.uploaded_by_id
     WHERE p.event_id = $1
     ORDER BY p.uploaded_at DESC, p.id DESC`,
    [eventId]
  );

  return photos;
}

export async function getPhotosGroupedByUploadDay(eventId: number): Promise<DayGroupedPhotos[]> {
  const photos = await getPhotosByEventId(eventId);
  const supabase = createAdminClient();
  const bucketName = process.env.SUPABASE_STORAGE_BUCKET || "event-photos";

  // Resolve signed URLs for each photo in parallel
  const photosWithSignedUrls = await Promise.all(
    photos.map(async (photo) => {
      try {
        const { data: signedData } = await supabase.storage
          .from(bucketName)
          .createSignedUrl(photo.storage_path, 86400);

        const { data: publicData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(photo.storage_path);

        const url = signedData?.signedUrl || publicData?.publicUrl || `/media/${photo.storage_path}`;

        return {
          ...photo,
          signedUrl: url,
          signed_url: url,
        };
      } catch {
        return {
          ...photo,
          signedUrl: `/media/${photo.storage_path}`,
          signed_url: `/media/${photo.storage_path}`,
        };
      }
    })
  );

  // Group strictly by upload date (YYYY-MM-DD)
  const groupsMap = new Map<string, (Photo & { signedUrl?: string })[]>();

  for (const photo of photosWithSignedUrls) {
    const rawDate = photo.uploaded_at || photo.created_at;
    const dateKey = new Date(rawDate).toISOString().split("T")[0]; // YYYY-MM-DD

    if (!groupsMap.has(dateKey)) {
      groupsMap.set(dateKey, []);
    }
    groupsMap.get(dateKey)!.push(photo);
  }

  const result: DayGroupedPhotos[] = [];
  const sortedDates = Array.from(groupsMap.keys()).sort((a, b) => b.localeCompare(a));

  for (const dateKey of sortedDates) {
    const dateObj = new Date(`${dateKey}T12:00:00Z`);
    const displayDate = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(dateObj);

    result.push({
      date: dateKey,
      displayDate,
      photos: groupsMap.get(dateKey)!,
    });
  }

  return result;
}

export async function createPhoto(data: {
  eventId: number;
  uploadedById: number;
  filename: string;
  storagePath: string;
  fileSize: number;
  mimeType: string;
  width?: number;
  height?: number;
  uploadedAt?: string;
}): Promise<Photo> {
  const now = data.uploadedAt || new Date().toISOString();

  const photo = await queryOne<Photo>(
    `INSERT INTO photos_photo (event_id, uploaded_by_id, filename, storage_path, file_size, mime_type, width, height, uploaded_at, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      data.eventId,
      data.uploadedById,
      data.filename,
      data.storagePath,
      data.fileSize,
      data.mimeType,
      data.width || null,
      data.height || null,
      now,
      now,
    ]
  );

  if (!photo) throw new Error("Failed to insert photo record.");
  return photo;
}

export async function deletePhoto(photoId: number): Promise<boolean> {
  const photo = await queryOne<Photo>(`SELECT * FROM photos_photo WHERE id = $1`, [photoId]);
  if (!photo) return false;

  const supabase = createAdminClient();
  const bucketName = process.env.SUPABASE_STORAGE_BUCKET || "event-photos";

  try {
    await supabase.storage.from(bucketName).remove([photo.storage_path]);
  } catch (err) {
    console.warn("Storage object deletion warning:", err);
  }

  await query(`DELETE FROM photos_photo WHERE id = $1`, [photoId]);
  return true;
}

export async function getAllRecentPhotos(limit: number = 10, workspaceId?: number): Promise<any[]> {
  const params: any[] = [];
  let whereClause = "";
  if (workspaceId) {
    whereClause = "WHERE e.workspace_id = $1";
    params.push(workspaceId);
    params.push(limit);
  } else {
    params.push(limit);
  }
  const limitParam = workspaceId ? "$2" : "$1";

  const photos = await query<any>(
    `SELECT p.*, 
            e.name as event_name,
            u.username as uploader_username, 
            u.first_name as uploader_first_name, 
            u.last_name as uploader_last_name
     FROM photos_photo p
     LEFT JOIN events_event e ON e.id = p.event_id
     LEFT JOIN auth_user u ON u.id = p.uploaded_by_id
     ${whereClause}
     ORDER BY p.uploaded_at DESC, p.id DESC
     LIMIT ${limitParam}`,
    params
  );
  return photos;
}
