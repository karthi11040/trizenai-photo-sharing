import { getCurrentUser } from "@/lib/auth/session";
import { queryOne } from "@/lib/db";
import type { UserWithProfile } from "@/lib/db/users";

export interface WorkspaceSessionContext {
  user: UserWithProfile;
  workspaceId: number;
}

/**
 * 1. Server Guard: Require Authenticated Active Workspace User
 * Extracts user identity and workspace_id from session token on server.
 * Never trusts workspace_id from client forms.
 */
export async function requireWorkspaceSession(): Promise<WorkspaceSessionContext> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Authentication required");
  }

  const status = user.profile?.status || "ACTIVE";
  const workspaceId = user.profile?.workspace_id || 1;

  if (status === "SUSPENDED") {
    throw new Error("Suspended user cannot access workspace resources");
  }

  return { user, workspaceId };
}

/**
 * 2. Server Guard: Assert Workspace Access (PREVENT IDOR)
 * Verifies resourceWorkspaceId matches userWorkspaceId.
 */
export function assertWorkspaceAccess(resourceWorkspaceId: number | undefined | null, userWorkspaceId: number) {
  if (!resourceWorkspaceId || Number(resourceWorkspaceId) !== Number(userWorkspaceId)) {
    throw new Error("You do not have access to this workspace resource.");
  }
}

/**
 * 3. Server Guard: Require Workspace Role
 */
export async function requireWorkspaceRole(
  allowedRoles: Array<"ADMIN" | "CO_ADMIN" | "TEAM_MEMBER">
): Promise<WorkspaceSessionContext> {
  const ctx = await requireWorkspaceSession();
  const userRole = ctx.user.profile?.role || (ctx.user.is_superuser ? "ADMIN" : "TEAM_MEMBER");
  
  if (!allowedRoles.includes(userRole as any) && !ctx.user.is_superuser) {
    throw new Error("You do not have access to this workspace resource.");
  }

  return ctx;
}

/**
 * 4. Server Guard: Require Event Access within Workspace
 * Admin & Co-Admin: Full access to all events in their workspace.
 * Team Member: Access ONLY to events belonging to their workspace AND assigned in membership.
 */
export async function requireEventAccess(eventId: number): Promise<{ user: UserWithProfile; workspaceId: number; event: any }> {
  const ctx = await requireWorkspaceSession();

  const event = await queryOne<any>(
    "SELECT id, workspace_id, created_by_id FROM events_event WHERE id = $1",
    [eventId]
  );

  if (!event) {
    throw new Error("You do not have access to this workspace resource.");
  }

  assertWorkspaceAccess(event.workspace_id, ctx.workspaceId);

  const userRole = ctx.user.profile?.role || (ctx.user.is_superuser ? "ADMIN" : "TEAM_MEMBER");

  if (userRole === "TEAM_MEMBER" && !ctx.user.is_superuser) {
    const membership = await queryOne<any>(
      "SELECT id FROM events_eventmembership WHERE event_id = $1 AND user_id = $2",
      [eventId, ctx.user.id]
    );

    if (!membership) {
      throw new Error("You do not have access to this workspace resource.");
    }
  }

  return { ...ctx, event };
}

/**
 * 5. Server Guard: Require Gallery Access within Workspace
 */
export async function requireGalleryAccess(galleryIdOrSlug: string | number): Promise<{ user: UserWithProfile; workspaceId: number; gallery: any }> {
  const ctx = await requireWorkspaceSession();

  const isId = typeof galleryIdOrSlug === "number" || !isNaN(Number(galleryIdOrSlug));
  const sql = isId
    ? "SELECT id, workspace_id, event_id, is_published FROM galleries_gallery WHERE id = $1"
    : "SELECT id, workspace_id, event_id, is_published FROM galleries_gallery WHERE slug = $1";

  const gallery = await queryOne<any>(sql, [galleryIdOrSlug]);

  if (!gallery) {
    throw new Error("You do not have access to this workspace resource.");
  }

  assertWorkspaceAccess(gallery.workspace_id, ctx.workspaceId);

  return { ...ctx, gallery };
}
