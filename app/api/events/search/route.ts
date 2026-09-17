import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ events: [] }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim().toLowerCase();

    if (!q || q.length < 2) {
      return NextResponse.json({ events: [] });
    }

    const isAdmin = user.is_superuser || user.profile?.role === "ADMIN" || user.profile?.role === "CO_ADMIN";

    const workspaceId = user.profile?.workspace_id || 1;

    let sql: string;
    let params: any[];

    if (isAdmin) {
      sql = `
        SELECT e.id, e.name, e.slug, e.category, e.event_date, e.location, e.client_name,
               COUNT(DISTINCT p.id) as photos_count,
               g.id as gallery_id, g.slug as gallery_slug, g.is_published as gallery_is_published
        FROM events_event e
        LEFT JOIN photos_photo p ON p.event_id = e.id
        LEFT JOIN galleries_gallery g ON g.event_id = e.id
        WHERE e.workspace_id = $2 AND (
             LOWER(e.name) LIKE $1 
          OR LOWER(COALESCE(e.client_name, '')) LIKE $1
          OR LOWER(COALESCE(e.location, '')) LIKE $1
          OR LOWER(COALESCE(e.category, '')) LIKE $1
          OR LOWER(COALESCE(e.description, '')) LIKE $1
          OR LOWER(COALESCE(e.slug, '')) LIKE $1
        )
        GROUP BY e.id, g.id, g.slug, g.is_published
        ORDER BY e.event_date DESC, e.created_at DESC
        LIMIT 8
      `;
      params = [`%${q}%`, workspaceId];
    } else {
      sql = `
        SELECT e.id, e.name, e.slug, e.category, e.event_date, e.location, e.client_name,
               COUNT(DISTINCT p.id) as photos_count,
               g.id as gallery_id, g.slug as gallery_slug, g.is_published as gallery_is_published
        FROM events_event e
        INNER JOIN events_eventmembership m ON m.event_id = e.id AND m.user_id = $2
        LEFT JOIN photos_photo p ON p.event_id = e.id
        LEFT JOIN galleries_gallery g ON g.event_id = e.id
        WHERE e.workspace_id = $3 AND (
             LOWER(e.name) LIKE $1 
          OR LOWER(COALESCE(e.client_name, '')) LIKE $1
          OR LOWER(COALESCE(e.location, '')) LIKE $1
          OR LOWER(COALESCE(e.category, '')) LIKE $1
          OR LOWER(COALESCE(e.description, '')) LIKE $1
          OR LOWER(COALESCE(e.slug, '')) LIKE $1
        )
        GROUP BY e.id, g.id, g.slug, g.is_published
        ORDER BY e.event_date DESC, e.created_at DESC
        LIMIT 8
      `;
      params = [`%${q}%`, user.id, workspaceId];
    }

    const events = await query<any>(sql, params);

    return NextResponse.json({
      events: events.map((e) => ({
        id: e.id,
        name: e.name,
        slug: e.slug,
        category: e.category || "General",
        eventDate: e.event_date,
        location: e.location,
        clientName: e.client_name,
        photosCount: Number(e.photos_count) || 0,
        gallerySlug: e.gallery_slug,
        isPublished: Boolean(e.gallery_is_published),
      })),
    });
  } catch (error: any) {
    console.error("Event search error:", error);
    return NextResponse.json({ events: [], error: error.message }, { status: 500 });
  }
}
