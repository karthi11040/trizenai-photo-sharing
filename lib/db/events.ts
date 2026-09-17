import { query, queryOne } from "./index";
import { findUserById } from "./users";
import type { Event, EventMembership, EventStatus, User } from "@/types/database";

export async function getAllEvents(workspaceId: number = 1): Promise<Event[]> {
  const events = await query<Event>(
    `SELECT e.*, 
            COUNT(DISTINCT p.id) as photos_count,
            COUNT(DISTINCT m.user_id) as members_count,
            g.id as gallery_id,
            g.slug as gallery_slug,
            g.is_published as gallery_is_published
     FROM events_event e
     LEFT JOIN photos_photo p ON p.event_id = e.id
     LEFT JOIN events_eventmembership m ON m.event_id = e.id
     LEFT JOIN galleries_gallery g ON g.event_id = e.id
     WHERE e.workspace_id = $1
     GROUP BY e.id, g.id, g.slug, g.is_published
     ORDER BY e.event_date DESC, e.created_at DESC`,
    [workspaceId]
  );

  return events.map((e: any) => ({
    ...e,
    photos_count: Number(e.photos_count) || 0,
    members_count: Number(e.members_count) || 0,
    status: e.status || "UPCOMING",
    gallery_status: e.gallery_id ? (e.gallery_is_published ? "PUBLISHED" : "DRAFT") : "NONE",
  }));
}

export async function getEventsByUserId(userId: number, isAdmin: boolean, workspaceId: number = 1): Promise<Event[]> {
  if (isAdmin) {
    return getAllEvents(workspaceId);
  }

  const events = await query<Event>(
    `SELECT e.*, 
            COUNT(DISTINCT p.id) as photos_count,
            COUNT(DISTINCT m2.user_id) as members_count,
            g.id as gallery_id,
            g.slug as gallery_slug,
            g.is_published as gallery_is_published
     FROM events_event e
     INNER JOIN events_eventmembership m ON m.event_id = e.id AND m.user_id = $1
     LEFT JOIN photos_photo p ON p.event_id = e.id
     LEFT JOIN events_eventmembership m2 ON m2.event_id = e.id
     LEFT JOIN galleries_gallery g ON g.event_id = e.id
     WHERE e.workspace_id = $2
     GROUP BY e.id, g.id, g.slug, g.is_published
     ORDER BY e.event_date DESC, e.created_at DESC`,
    [userId, workspaceId]
  );

  return events.map((e: any) => ({
    ...e,
    photos_count: Number(e.photos_count) || 0,
    members_count: Number(e.members_count) || 0,
    status: e.status || "UPCOMING",
    gallery_status: e.gallery_id ? (e.gallery_is_published ? "PUBLISHED" : "DRAFT") : "NONE",
  }));
}

export async function getEventById(eventId: number | string, workspaceId?: number): Promise<Event | null> {
  const isNumeric = typeof eventId === "number" || /^\d+$/.test(String(eventId));
  
  let sql = `
    SELECT e.*, 
           COUNT(DISTINCT p.id) as photos_count,
           COUNT(DISTINCT m.user_id) as members_count,
           g.id as gallery_id,
           g.slug as gallery_slug,
           g.is_published as gallery_is_published
    FROM events_event e
    LEFT JOIN photos_photo p ON p.event_id = e.id
    LEFT JOIN events_eventmembership m ON m.event_id = e.id
    LEFT JOIN galleries_gallery g ON g.event_id = e.id
    WHERE (${isNumeric ? "e.id = $1 OR e.slug = $2" : "e.slug = $1 OR e.id = $2"})
  `;

  const params: any[] = isNumeric ? [Number(eventId), String(eventId)] : [String(eventId), -1];

  if (workspaceId) {
    sql += ` AND e.workspace_id = $3`;
    params.push(workspaceId);
  }

  sql += ` GROUP BY e.id, g.id, g.slug, g.is_published`;

  const event = await queryOne<Event>(sql, params);

  if (!event) return null;

  return {
    ...event,
    photos_count: Number((event as any).photos_count) || 0,
    members_count: Number((event as any).members_count) || 0,
    status: (event as any).status || "UPCOMING",
    gallery_status: (event as any).gallery_id ? ((event as any).gallery_is_published ? "PUBLISHED" : "DRAFT") : "NONE",
  };
}

export async function getEventByIdOrSlug(idOrSlug: string | number, workspaceId?: number): Promise<Event | null> {
  return getEventById(idOrSlug, workspaceId);
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

export async function updateEventStatus(eventId: number, status: EventStatus, workspaceId?: number): Promise<Event | null> {
  await ensureStateColumns();
  const sql = workspaceId
    ? `UPDATE events_event SET status = $1, updated_at = NOW() WHERE id = $2 AND workspace_id = $3`
    : `UPDATE events_event SET status = $1, updated_at = NOW() WHERE id = $2`;
  const params = workspaceId ? [status, eventId, workspaceId] : [status, eventId];
  await query(sql, params);
  return getEventById(eventId, workspaceId);
}

export async function cancelEvent(eventId: number, reason: string, cancelledById: number, workspaceId?: number): Promise<Event | null> {
  await ensureStateColumns();
  const now = new Date().toISOString();
  const sql = workspaceId
    ? `UPDATE events_event 
       SET status = 'QUIT',
           is_cancelled = true,
           cancellation_reason = $1,
           cancelled_at = $2,
           cancelled_by_id = $3,
           updated_at = $2
       WHERE id = $4 AND workspace_id = $5`
    : `UPDATE events_event 
       SET status = 'QUIT',
           is_cancelled = true,
           cancellation_reason = $1,
           cancelled_at = $2,
           cancelled_by_id = $3,
           updated_at = $2
       WHERE id = $4`;
  const params = workspaceId ? [reason.trim(), now, cancelledById, eventId, workspaceId] : [reason.trim(), now, cancelledById, eventId];
  await query(sql, params);
  return getEventById(eventId, workspaceId);
}

export async function rescheduleEvent(
  eventId: number,
  eventDate: string,
  startTime: string,
  endTime: string,
  reason?: string,
  workspaceId?: number
): Promise<Event | null> {
  await ensureStateColumns();
  const now = new Date().toISOString();
  const sql = workspaceId
    ? `UPDATE events_event 
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
       WHERE id = $5 AND workspace_id = $6`
    : `UPDATE events_event 
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
       WHERE id = $5`;
  const params = workspaceId ? [eventDate.trim(), startTime.trim(), endTime.trim(), now, eventId, workspaceId] : [eventDate.trim(), startTime.trim(), endTime.trim(), now, eventId];
  await query(sql, params);
  return getEventById(eventId, workspaceId);
}

export async function startShootNow(eventId: number, workspaceId?: number): Promise<Event | null> {
  await ensureStateColumns();
  const now = new Date().toISOString();
  const sql = workspaceId
    ? `UPDATE events_event 
       SET status = 'STARTED',
           actual_started_at = $1,
           actual_completed_at = NULL,
           is_cancelled = false,
           updated_at = $1
       WHERE id = $2 AND workspace_id = $3`
    : `UPDATE events_event 
       SET status = 'STARTED',
           actual_started_at = $1,
           actual_completed_at = NULL,
           is_cancelled = false,
           updated_at = $1
       WHERE id = $2`;
  const params = workspaceId ? [now, eventId, workspaceId] : [now, eventId];
  await query(sql, params);
  return getEventById(eventId, workspaceId);
}

export async function completeShootNow(eventId: number, workspaceId?: number): Promise<Event | null> {
  await ensureStateColumns();
  const now = new Date().toISOString();
  const sql = workspaceId
    ? `UPDATE events_event 
       SET status = 'COMPLETED',
           actual_completed_at = $1,
           is_cancelled = false,
           updated_at = $1
       WHERE id = $2 AND workspace_id = $3`
    : `UPDATE events_event 
       SET status = 'COMPLETED',
           actual_completed_at = $1,
           is_cancelled = false,
           updated_at = $1
       WHERE id = $2`;
  const params = workspaceId ? [now, eventId, workspaceId] : [now, eventId];
  await query(sql, params);
  return getEventById(eventId, workspaceId);
}

export async function getEventMembers(eventId: number, workspaceId?: number): Promise<User[]> {
  const params = workspaceId ? [eventId, workspaceId] : [eventId];
  return query<User>(
    `SELECT u.id, u.username, u.email, u.first_name, u.last_name
     FROM auth_user u
     INNER JOIN events_eventmembership m ON m.user_id = u.id
     LEFT JOIN accounts_profile p ON p.user_id = u.id
     WHERE m.event_id = $1
       ${workspaceId ? "AND p.workspace_id = $2" : ""}
       AND (u.is_superuser = true OR p.role IN ('ADMIN', 'CO_ADMIN') OR p.status = 'ACTIVE' OR p.status IS NULL)
     ORDER BY u.first_name ASC, u.username ASC`,
    params
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
  workspaceId?: number;
}): Promise<Event> {
  const now = new Date().toISOString();
  const workspaceId = data.workspaceId || 1;

  const event = await queryOne<Event>(
    `INSERT INTO events_event (
      workspace_id, name, slug, category, client_name, client_email, client_phone,
      description, event_date, start_time, end_time, location, venue_address,
      cover_image, created_by_id, created_at, updated_at
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
     RETURNING *`,
    [
      workspaceId,
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
    workspaceId?: number;
  },
  workspaceId?: number
): Promise<Event | null> {
  const targetWorkspaceId = workspaceId || data.workspaceId;
  const now = new Date().toISOString();
  const sql = targetWorkspaceId
    ? `UPDATE events_event 
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
       WHERE id = $14 AND workspace_id = $15`
    : `UPDATE events_event 
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
       WHERE id = $14`;

  const params = targetWorkspaceId
    ? [
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
        targetWorkspaceId,
      ]
    : [
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
      ];

  await query(sql, params);
  return getEventById(id, targetWorkspaceId);
}

export async function deleteEvent(eventId: number, workspaceId?: number): Promise<void> {
  if (!eventId || typeof eventId !== "number" || eventId <= 0) {
    throw new Error("Invalid event ID provided for deletion.");
  }
  const event = await getEventById(eventId, workspaceId);
  if (!event) throw new Error("You do not have access to this workspace resource.");

  await query(`DELETE FROM galleries_galleryphoto WHERE gallery_id IN (SELECT id FROM galleries_gallery WHERE event_id = $1)`, [eventId]);
  await query(`DELETE FROM galleries_galleryview WHERE gallery_id IN (SELECT id FROM galleries_gallery WHERE event_id = $1)`, [eventId]);
  await query(`DELETE FROM galleries_gallery WHERE event_id = $1`, [eventId]);
  await query(`DELETE FROM photos_photo WHERE event_id = $1`, [eventId]);
  await query(`DELETE FROM events_eventmembership WHERE event_id = $1`, [eventId]);
  await query(`DELETE FROM events_event WHERE id = $1`, [eventId]);
}

/**
 * Assigns photographer to photoshoot event.
 * Enforces strict workspace isolation: Team member MUST belong to the event's workspace!
 */
export async function addEventMember(eventId: number, userId: number, workspaceId?: number): Promise<void> {
  const event = await getEventById(eventId);
  if (!event) throw new Error("You do not have access to this workspace resource.");

  const targetUser = await findUserById(userId);
  if (!targetUser) throw new Error("Team member not found.");

  const userWorkspaceId = targetUser.profile?.workspace_id || 1;
  const eventWorkspaceId = (event as any).workspace_id || 1;

  if (userWorkspaceId !== eventWorkspaceId || (workspaceId && workspaceId !== userWorkspaceId)) {
    throw new Error("This team member belongs to another workspace and cannot be assigned to this event.");
  }

  const isAdmin = Boolean(targetUser.is_superuser || targetUser.profile?.role === "ADMIN" || targetUser.profile?.role === "CO_ADMIN");
  const isActive = targetUser.profile?.status === "ACTIVE" || targetUser.profile?.status === undefined;
  if (!isAdmin && !isActive) {
    throw new Error("Only ACTIVE team members can be assigned to photoshoot events.");
  }

  const now = new Date().toISOString();
  await query(
    `INSERT INTO events_eventmembership (event_id, user_id, created_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (event_id, user_id) DO NOTHING`,
    [eventId, userId, now]
  );
}

export async function removeEventMember(eventId: number, userId: number, workspaceId?: number): Promise<void> {
  if (workspaceId) {
    const event = await getEventById(eventId, workspaceId);
    if (!event) throw new Error("You do not have access to this workspace resource.");
  }
  await query(
    `DELETE FROM events_eventmembership WHERE event_id = $1 AND user_id = $2`,
    [eventId, userId]
  );
}

export async function getCalendarEventCounts(workspaceId: number = 1): Promise<Record<string, number>> {
  const rows = await query<{ event_date: string; count: string }>(
    `SELECT event_date, COUNT(*) as count
     FROM events_event
     WHERE event_date IS NOT NULL AND workspace_id = $1
     GROUP BY event_date
     ORDER BY event_date ASC`,
    [workspaceId]
  );

  const counts: Record<string, number> = {};
  rows.forEach((r) => {
    if (r.event_date) {
      counts[r.event_date] = parseInt(String(r.count), 10);
    }
  });
  return counts;
}
