import { query, queryOne } from "./index";
import { findUserById } from "./users";
import type { Event, EventMembership, EventStatus, User } from "@/types/database";

export async function getAllEvents(): Promise<Event[]> {
  const events = await query<Event>(
    `SELECT e.*, 
            COUNT(DISTINCT p.id)::int as photos_count,
            COUNT(DISTINCT m.user_id)::int as members_count,
            g.id as gallery_id,
            g.slug as gallery_slug,
            g.is_published as gallery_is_published
     FROM events_event e
     LEFT JOIN photos_photo p ON p.event_id = e.id
     LEFT JOIN events_eventmembership m ON m.event_id = e.id
     LEFT JOIN galleries_gallery g ON g.event_id = e.id
     GROUP BY e.id, g.id, g.slug, g.is_published
     ORDER BY e.event_date DESC, e.created_at DESC`
  );

  return events.map((e: any) => ({
    ...e,
    status: e.status || "UPCOMING",
    gallery_status: e.gallery_id ? (e.gallery_is_published ? "PUBLISHED" : "DRAFT") : "NONE",
  }));
}

export async function getEventsByUserId(userId: number, isAdmin: boolean): Promise<Event[]> {
  if (isAdmin) {
    return getAllEvents();
  }

  const events = await query<Event>(
    `SELECT e.*, 
            COUNT(DISTINCT p.id)::int as photos_count,
            COUNT(DISTINCT m2.user_id)::int as members_count,
            g.id as gallery_id,
            g.slug as gallery_slug,
            g.is_published as gallery_is_published
     FROM events_event e
     INNER JOIN events_eventmembership m ON m.event_id = e.id AND m.user_id = $1
     LEFT JOIN photos_photo p ON p.event_id = e.id
     LEFT JOIN events_eventmembership m2 ON m2.event_id = e.id
     LEFT JOIN galleries_gallery g ON g.event_id = e.id
     GROUP BY e.id, g.id, g.slug, g.is_published
     ORDER BY e.event_date DESC, e.created_at DESC`,
    [userId]
  );

  return events.map((e: any) => ({
    ...e,
    status: e.status || "UPCOMING",
    gallery_status: e.gallery_id ? (e.gallery_is_published ? "PUBLISHED" : "DRAFT") : "NONE",
  }));
}

export async function getEventById(eventId: number | string): Promise<Event | null> {
  const isNumeric = typeof eventId === "number" || /^\d+$/.test(String(eventId));
  
  const event = await queryOne<Event>(
    `SELECT e.*, 
            COUNT(DISTINCT p.id)::int as photos_count,
            COUNT(DISTINCT m.user_id)::int as members_count,
            g.id as gallery_id,
            g.slug as gallery_slug,
            g.is_published as gallery_is_published
     FROM events_event e
     LEFT JOIN photos_photo p ON p.event_id = e.id
     LEFT JOIN events_eventmembership m ON m.event_id = e.id
     LEFT JOIN galleries_gallery g ON g.event_id = e.id
     WHERE ${isNumeric ? "e.id = $1 OR e.slug = $2" : "e.slug = $1 OR e.id = $2"}
     GROUP BY e.id, g.id, g.slug, g.is_published`,
    isNumeric ? [Number(eventId), String(eventId)] : [String(eventId), -1]
  );

  if (!event) return null;

  return {
    ...event,
    status: (event as any).status || "UPCOMING",
    gallery_status: (event as any).gallery_id ? ((event as any).gallery_is_published ? "PUBLISHED" : "DRAFT") : "NONE",
  };
}

export async function getEventByIdOrSlug(idOrSlug: string | number): Promise<Event | null> {
  return getEventById(idOrSlug);
}

export async function ensureStateColumns(): Promise<void> {
  try {
    await query(`
      ALTER TABLE events_event 
      ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'UPCOMING',
      ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
      ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS cancelled_by_id INT,
      ADD COLUMN IF NOT EXISTS actual_started_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS actual_completed_at TIMESTAMPTZ
    `);
  } catch (e) {
    // Ignore if exists
  }
}

export async function updateEventStatus(eventId: number, status: EventStatus): Promise<Event | null> {
  await ensureStateColumns();
  await query(
    `UPDATE events_event SET status = $1, updated_at = NOW() WHERE id = $2`,
    [status, eventId]
  );
  return getEventById(eventId);
}

export async function cancelEvent(eventId: number, reason: string, cancelledById: number): Promise<Event | null> {
  await ensureStateColumns();
  const now = new Date().toISOString();
  await query(
    `UPDATE events_event 
     SET status = 'QUIT',
         is_cancelled = true,
         cancellation_reason = $1,
         cancelled_at = $2,
         cancelled_by_id = $3,
         updated_at = $2
     WHERE id = $4`,
    [reason.trim(), now, cancelledById, eventId]
  );
  return getEventById(eventId);
}

export async function rescheduleEvent(
  eventId: number,
  eventDate: string,
  startTime: string,
  endTime: string,
  reason?: string
): Promise<Event | null> {
  await ensureStateColumns();
  const now = new Date().toISOString();
  await query(
    `UPDATE events_event 
     SET status = 'UPCOMING',
         is_cancelled = false,
         cancellation_reason = NULL,
         cancelled_at = NULL,
         cancelled_by_id = NULL,
         actual_started_at = NULL,
         actual_completed_at = NULL,
         event_date = $1,
         start_time = $2,
         end_time = $3,
         updated_at = $4
     WHERE id = $5`,
    [eventDate.trim(), startTime.trim(), endTime.trim(), now, eventId]
  );
  return getEventById(eventId);
}

export async function startShootNow(eventId: number): Promise<Event | null> {
  await ensureStateColumns();
  const now = new Date().toISOString();
  await query(
    `UPDATE events_event 
     SET status = 'STARTED',
         actual_started_at = $1,
         actual_completed_at = NULL,
         is_cancelled = false,
         updated_at = $1
     WHERE id = $2`,
    [now, eventId]
  );
  return getEventById(eventId);
}

export async function completeShootNow(eventId: number): Promise<Event | null> {
  await ensureStateColumns();
  const now = new Date().toISOString();
  await query(
    `UPDATE events_event 
     SET status = 'COMPLETED',
         actual_completed_at = $1,
         is_cancelled = false,
         updated_at = $1
     WHERE id = $2`,
    [now, eventId]
  );
  return getEventById(eventId);
}

export async function getEventMembers(eventId: number): Promise<User[]> {
  return query<User>(
    `SELECT u.id, u.username, u.email, u.first_name, u.last_name
     FROM auth_user u
     INNER JOIN events_eventmembership m ON m.user_id = u.id
     LEFT JOIN accounts_profile p ON p.user_id = u.id
     WHERE m.event_id = $1
       AND (u.is_superuser = true OR p.role IN ('ADMIN', 'CO_ADMIN') OR p.status = 'ACTIVE' OR p.status IS NULL)
     ORDER BY u.first_name ASC, u.username ASC`,
    [eventId]
  );
}

export async function createEvent(data: {
  name: string;
  slug: string;
  category?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  description?: string;
  eventDate?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  venueAddress?: string;
  coverImage?: string;
  createdById: number;
}): Promise<Event> {
  const now = new Date().toISOString();
  const event = await queryOne<Event>(
    `INSERT INTO events_event (
      name, slug, category, client_name, client_email, client_phone,
      description, event_date, start_time, end_time, location, venue_address,
      cover_image, created_by_id, created_at, updated_at
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
     RETURNING *`,
    [
      data.name.trim(),
      data.slug.trim(),
      data.category || "Wedding",
      data.clientName || "",
      data.clientEmail || "",
      data.clientPhone || "",
      data.description || "",
      data.eventDate || null,
      data.startTime || "",
      data.endTime || "",
      data.location || "",
      data.venueAddress || "",
      data.coverImage || "",
      data.createdById,
      now,
      now,
    ]
  );

  if (!event) throw new Error("Failed to insert event record.");
  return event;
}

export async function updateEvent(
  id: number,
  data: {
    name?: string;
    category?: string;
    clientName?: string;
    clientEmail?: string;
    clientPhone?: string;
    description?: string;
    eventDate?: string;
    startTime?: string;
    endTime?: string;
    location?: string;
    venueAddress?: string;
    coverImage?: string;
  }
): Promise<Event | null> {
  const now = new Date().toISOString();
  await query(
    `UPDATE events_event 
     SET name = COALESCE($1, name),
         category = COALESCE($2, category),
         client_name = COALESCE($3, client_name),
         client_email = COALESCE($4, client_email),
         client_phone = COALESCE($5, client_phone),
         description = COALESCE($6, description),
         event_date = COALESCE($7, event_date),
         start_time = COALESCE($8, start_time),
         end_time = COALESCE($9, end_time),
         location = COALESCE($10, location),
         venue_address = COALESCE($11, venue_address),
         cover_image = COALESCE($12, cover_image),
         updated_at = $13
     WHERE id = $14`,
    [
      data.name ?? null,
      data.category ?? null,
      data.clientName ?? null,
      data.clientEmail ?? null,
      data.clientPhone ?? null,
      data.description ?? null,
      data.eventDate ?? null,
      data.startTime ?? null,
      data.endTime ?? null,
      data.location ?? null,
      data.venueAddress ?? null,
      data.coverImage ?? null,
      now,
      id,
    ]
  );
  return getEventById(id);
}

export async function deleteEvent(eventId: number): Promise<void> {
  if (!eventId || typeof eventId !== "number" || eventId <= 0) {
    throw new Error("Invalid event ID provided for deletion to prevent accidental data loss.");
  }
  await query(`DELETE FROM galleries_galleryphoto WHERE gallery_id IN (SELECT id FROM galleries_gallery WHERE event_id = $1)`, [eventId]);
  await query(`DELETE FROM galleries_galleryview WHERE gallery_id IN (SELECT id FROM galleries_gallery WHERE event_id = $1)`, [eventId]);
  await query(`DELETE FROM galleries_gallery WHERE event_id = $1`, [eventId]);
  await query(`DELETE FROM photos_photo WHERE event_id = $1`, [eventId]);
  await query(`DELETE FROM events_eventmembership WHERE event_id = $1`, [eventId]);
  await query(`DELETE FROM events_event WHERE id = $1`, [eventId]);
}

export async function addEventMember(eventId: number, userId: number): Promise<void> {
  const targetUser = await findUserById(userId);
  if (targetUser) {
    const isAdmin = Boolean(targetUser.is_superuser || targetUser.profile?.role === "ADMIN" || targetUser.profile?.role === "CO_ADMIN");
    const isActive = targetUser.profile?.status === "ACTIVE" || targetUser.profile?.status === undefined;
    if (!isAdmin && !isActive) {
      throw new Error("Only ACTIVE team members can be assigned to photoshoot events.");
    }
  }

  await query(
    `INSERT INTO events_eventmembership (event_id, user_id, created_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (event_id, user_id) DO NOTHING`,
    [eventId, userId]
  );
}

export async function removeEventMember(eventId: number, userId: number): Promise<void> {
  await query(
    `DELETE FROM events_eventmembership WHERE event_id = $1 AND user_id = $2`,
    [eventId, userId]
  );
}

export async function getCalendarEventCounts(): Promise<Record<string, number>> {
  const rows = await query<{ event_date: string; count: string }>(
    `SELECT TO_CHAR(event_date, 'YYYY-MM-DD') as event_date, COUNT(*)::int as count
     FROM events_event
     WHERE event_date IS NOT NULL
     GROUP BY event_date
     ORDER BY event_date ASC`
  );

  const counts: Record<string, number> = {};
  rows.forEach((r) => {
    if (r.event_date) {
      counts[r.event_date] = parseInt(r.count, 10);
    }
  });
  return counts;
}
