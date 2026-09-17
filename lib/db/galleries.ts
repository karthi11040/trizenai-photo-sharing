import { query, queryOne } from "./index";
import type { Gallery, GalleryPhoto, GalleryView, Photo } from "@/types/database";
import { getFastStorageUrl } from "@/lib/utils/image";
import crypto from "crypto";

export function hashPin(pin: string): string {
  return crypto.createHash("sha256").update(pin.trim()).digest("hex");
}

export function verifyPin(pin: string, storedHash: string): boolean {
  if (storedHash.startsWith("pbkdf2_")) {
    const parts = storedHash.split("$");
    if (parts.length === 4) {
      const iterations = parseInt(parts[1], 10);
      const salt = parts[2];
      const expectedKey = parts[3];
      const derivedKey = crypto.pbkdf2Sync(pin.trim(), salt, iterations, 32, "sha256").toString("base64");
      return crypto.timingSafeEqual(Buffer.from(expectedKey), Buffer.from(derivedKey));
    }
  }
  const computed = hashPin(pin);
  return computed === storedHash;
}

export async function getGalleriesList(): Promise<any[]> {
  const galleries = await query<any>(
    `SELECT g.*, 
            e.name as event_name, 
            e.event_date as event_date,
            e.cover_image as event_cover_image,
            (
              SELECT p.storage_path 
              FROM photos_photo p
              INNER JOIN galleries_galleryphoto gp ON gp.photo_id = p.id
              WHERE gp.gallery_id = g.id
              ORDER BY p.id ASC
              LIMIT 1
            ) as sample_photo_storage_path,
            COUNT(DISTINCT gp.photo_id)::int as photos_count,
            COUNT(DISTINCT gv.id)::int as views_count
     FROM galleries_gallery g
     INNER JOIN events_event e ON e.id = g.event_id
     LEFT JOIN galleries_galleryphoto gp ON gp.gallery_id = g.id
     LEFT JOIN galleries_galleryview gv ON gv.gallery_id = g.id
     GROUP BY g.id, e.id
     ORDER BY g.created_at DESC`
  );

  const enriched = galleries.map((g) => {
    let thumbnailUrl: string | null = getFastStorageUrl(g.event_cover_image);

    // Only fallback to sample gallery photo if event cover image is missing
    if (!thumbnailUrl && g.sample_photo_storage_path) {
      thumbnailUrl = getFastStorageUrl(g.sample_photo_storage_path);
    }

    return {
      ...g,
      thumbnailUrl,
    };
  });

  return enriched;
}

export async function getGalleryBySlug(slug: string): Promise<any | null> {
  const gallery = await queryOne<Gallery>(
    `SELECT g.*, 
            e.name as event_name, 
            e.event_date as event_date,
            e.location as event_location,
            e.cover_image as event_cover_image,
            'UPCOMING' as event_status,
            u.username as creator_username,
            u.first_name as creator_first_name,
            u.last_name as creator_last_name,
            p.studio_name as studio_name,
            p.studio_logo as studio_logo
     FROM galleries_gallery g
     INNER JOIN events_event e ON e.id = g.event_id
     LEFT JOIN auth_user u ON u.id = e.created_by_id
     LEFT JOIN accounts_profile p ON p.user_id = u.id
     WHERE g.slug = $1
     LIMIT 1`,
    [slug.trim()]
  );

  return gallery;
}

export async function getGalleryPhotos(galleryId: number): Promise<(Photo & { signedUrl?: string })[]> {
  const photos = await query<Photo>(
    `SELECT p.*
     FROM photos_photo p
     INNER JOIN galleries_galleryphoto gp ON gp.photo_id = p.id
     WHERE gp.gallery_id = $1
     ORDER BY p.uploaded_at DESC, p.id DESC`,
    [galleryId]
  );

  const withSignedUrls = photos.map((photo) => ({
    ...photo,
    signedUrl: getFastStorageUrl(photo.storage_path) || `/media/${photo.storage_path}`,
  }));

  return withSignedUrls;
}

export async function recordGalleryView(galleryId: number, ipAddress: string, userAgent: string, deviceType: string): Promise<void> {
  await query(
    `INSERT INTO galleries_galleryview (gallery_id, viewed_at, ip_address, user_agent, device_type)
     VALUES ($1, NOW(), $2, $3, $4)`,
    [galleryId, ipAddress || "127.0.0.1", userAgent || "", deviceType || "Web Client"]
  );
}

export async function createOrUpdateGallery(data: {
  eventId: number;
  title: string;
  slug: string;
  pin: string;
  photoIds: number[];
}): Promise<Gallery> {
  const pinHash = hashPin(data.pin);
  const pinCode = data.pin.trim();
  const now = new Date().toISOString();

  let gallery = await queryOne<Gallery>(
    `SELECT * FROM galleries_gallery WHERE event_id = $1`,
    [data.eventId]
  );

  if (!gallery) {
    gallery = await queryOne<Gallery>(
      `INSERT INTO galleries_gallery (event_id, title, slug, pin_hash, pin_code, is_published, published_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, true, $6, $7, $8)
       RETURNING *`,
      [data.eventId, data.title, data.slug, pinHash, pinCode, now, now, now]
    );
  } else {
    gallery = await queryOne<Gallery>(
      `UPDATE galleries_gallery 
       SET title = $1, slug = $2, pin_hash = $3, pin_code = $4, is_published = true, published_at = COALESCE(published_at, $5), updated_at = $6
       WHERE id = $7
       RETURNING *`,
      [data.title, data.slug, pinHash, pinCode, now, now, gallery.id]
    );
  }

  if (!gallery) throw new Error("Failed to create/update gallery record.");

  // Insert gallery photo links
  for (const photoId of data.photoIds) {
    await query(
      `INSERT INTO galleries_galleryphoto (gallery_id, photo_id, created_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (gallery_id, photo_id) DO NOTHING`,
      [gallery.id, photoId]
    );
  }

  return gallery;
}

export async function getGalleryPhotoIds(eventId: number): Promise<number[]> {
  const rows = await query<{ photo_id: number }>(
    `SELECT gp.photo_id
     FROM galleries_galleryphoto gp
     INNER JOIN galleries_gallery g ON g.id = gp.gallery_id
     WHERE g.event_id = $1`,
    [eventId]
  );
  return rows.map((r) => r.photo_id);
}

export async function updateGalleryPhotoSelection(
  eventId: number,
  photoIds: number[]
): Promise<{ updated: boolean }> {
  const gallery = await queryOne<{ id: number }>(
    `SELECT id FROM galleries_gallery WHERE event_id = $1 LIMIT 1`,
    [eventId]
  );

  if (!gallery) {
    return { updated: false };
  }

  // Replace all gallery photo links atomically
  await query(`DELETE FROM galleries_galleryphoto WHERE gallery_id = $1`, [gallery.id]);

  for (const photoId of photoIds) {
    await query(
      `INSERT INTO galleries_galleryphoto (gallery_id, photo_id, created_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (gallery_id, photo_id) DO NOTHING`,
      [gallery.id, photoId]
    );
  }

  await query(
    `UPDATE galleries_gallery SET updated_at = NOW() WHERE id = $1`,
    [gallery.id]
  );

  return { updated: true };
}
