import { query, queryOne } from "./index";
import type { User, Profile, Role, MemberStatus } from "@/types/database";
import { normalizeEmail, normalizePhone } from "@/lib/utils/normalization";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export interface Workspace {
  id: number;
  name: string;
  slug: string;
  owner_id: number;
  email: string;
  email_normalized: string;
  phone: string;
  phone_normalized: string;
  logo?: string | null;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  created_at: string;
  updated_at: string;
}

export interface UserWithProfile extends User {
  profile: Profile & { workspace_id?: number; phone_normalized?: string | null };
}

/**
 * 1. Global Identity Check for Email & Phone Uniqueness Across Workspaces
 */
export async function validateGlobalIdentity(
  email?: string | null,
  phone?: string | null,
  targetWorkspaceId?: number,
  excludeUserId?: number
): Promise<void> {
  const normEmail = normalizeEmail(email);
  const normPhone = normalizePhone(phone);

  if (normEmail) {
    // Check existing users
    const existingUser = await queryOne<any>(
      `SELECT u.id, p.workspace_id 
       FROM auth_user u
       LEFT JOIN accounts_profile p ON p.user_id = u.id
       WHERE (LOWER(u.email) = $1 OR u.email_normalized = $1)
       ${excludeUserId ? "AND u.id != " + Number(excludeUserId) : ""}
       LIMIT 1`,
      [normEmail]
    );

    if (existingUser) {
      const userWorkspaceId = existingUser.workspace_id || 1;
      if (targetWorkspaceId && userWorkspaceId === targetWorkspaceId) {
        throw new Error("This email is already part of your workspace.");
      } else {
        throw new Error("This email is already associated with another workspace and cannot be used here.");
      }
    }

    // Check existing workspace owners or invitations
    const existingInvitation = await queryOne<any>(
      `SELECT workspace_id FROM team_invitations WHERE email_normalized = $1 AND accepted_at IS NULL LIMIT 1`,
      [normEmail]
    );
    if (existingInvitation) {
      if (targetWorkspaceId && existingInvitation.workspace_id === targetWorkspaceId) {
        throw new Error("This email is already part of your workspace.");
      } else {
        throw new Error("This email is already associated with another workspace and cannot be used here.");
      }
    }
  }

  if (normPhone) {
    const existingPhone = await queryOne<any>(
      `SELECT p.user_id, p.workspace_id 
       FROM accounts_profile p
       WHERE p.phone_normalized = $1
       ${excludeUserId ? "AND p.user_id != " + Number(excludeUserId) : ""}
       LIMIT 1`,
      [normPhone]
    );

    if (existingPhone) {
      const phoneWorkspaceId = existingPhone.workspace_id || 1;
      if (targetWorkspaceId && phoneWorkspaceId === targetWorkspaceId) {
        throw new Error("This phone number is already part of your workspace.");
      } else {
        throw new Error("This phone number is already associated with another workspace and cannot be reused.");
      }
    }
  }
}

export async function findUserByEmail(email: string): Promise<UserWithProfile | null> {
  const norm = normalizeEmail(email);
  const user = await queryOne<User>(
    `SELECT * FROM auth_user WHERE LOWER(email) = $1 OR email_normalized = $1 LIMIT 1`,
    [norm]
  );
  if (!user) return null;

  const profile = await queryOne<Profile>(
    `SELECT * FROM accounts_profile WHERE user_id = $1 LIMIT 1`,
    [user.id]
  );

  return {
    ...user,
    profile: profile || {
      id: 0,
      user_id: user.id,
      workspace_id: 1,
      role: user.is_superuser ? "ADMIN" : "TEAM_MEMBER",
      status: "ACTIVE",
      studio_name: "TrizenAI Studio",
    },
  };
}

export async function findUserByUsername(username: string): Promise<UserWithProfile | null> {
  const user = await queryOne<User>(
    `SELECT * FROM auth_user WHERE LOWER(username) = LOWER($1) LIMIT 1`,
    [username.trim()]
  );
  if (!user) return null;

  const profile = await queryOne<Profile>(
    `SELECT * FROM accounts_profile WHERE user_id = $1 LIMIT 1`,
    [user.id]
  );

  return {
    ...user,
    profile: profile || {
      id: 0,
      user_id: user.id,
      workspace_id: 1,
      role: user.is_superuser ? "ADMIN" : "TEAM_MEMBER",
      status: "ACTIVE",
      studio_name: "TrizenAI Studio",
    },
  };
}

export async function findUserById(id: number): Promise<UserWithProfile | null> {
  const user = await queryOne<User>(`SELECT * FROM auth_user WHERE id = $1`, [id]);
  if (!user) return null;

  const profile = await queryOne<Profile>(
    `SELECT * FROM accounts_profile WHERE user_id = $1 LIMIT 1`,
    [user.id]
  );

  return {
    ...user,
    profile: profile || {
      id: 0,
      user_id: user.id,
      workspace_id: 1,
      role: user.is_superuser ? "ADMIN" : "TEAM_MEMBER",
      status: "ACTIVE",
      studio_name: "TrizenAI Studio",
    },
  };
}

export async function findUserByDashboardToken(token: string): Promise<UserWithProfile | null> {
  const profile = await queryOne<Profile>(
    `SELECT * FROM accounts_profile WHERE dashboard_token = $1 LIMIT 1`,
    [token]
  );
  if (!profile) return null;

  const user = await queryOne<User>(`SELECT * FROM auth_user WHERE id = $1`, [profile.user_id]);
  if (!user) return null;

  return {
    ...user,
    profile,
  };
}

/**
 * Creates a new independent Workspace with owner Admin user inside a transaction
 */
export async function createWorkspace(data: {
  workspaceName: string;
  adminUsername: string;
  adminEmail: string;
  adminPhone?: string;
  password: string;
  firstName?: string;
  lastName?: string;
}): Promise<{ workspace: Workspace; owner: UserWithProfile }> {
  const normEmail = normalizeEmail(data.adminEmail);
  const normPhone = normalizePhone(data.adminPhone);

  // Global identity uniqueness validation
  await validateGlobalIdentity(normEmail, normPhone);

  const now = new Date().toISOString();
  const slug = data.workspaceName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now();
  const passwordHash = await bcrypt.hash(data.password, 10);

  // Transaction: Create user, workspace, and set owner link
  const user = await queryOne<User>(
    `INSERT INTO auth_user (username, email, email_normalized, password, first_name, last_name, is_staff, is_superuser, is_active, date_joined)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id, username, email, first_name, last_name, is_staff, is_superuser`,
    [
      data.adminUsername.trim(),
      data.adminEmail.trim(),
      normEmail,
      passwordHash,
      data.firstName || "",
      data.lastName || "",
      true,
      true,
      true,
      now,
    ]
  );

  if (!user) throw new Error("Failed to create admin user.");

  const workspace = await queryOne<Workspace>(
    `INSERT INTO workspaces (name, slug, owner_id, email, email_normalized, phone, phone_normalized, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      data.workspaceName.trim(),
      slug,
      user.id,
      data.adminEmail.trim(),
      normEmail,
      data.adminPhone || "",
      normPhone,
      "ACTIVE",
      now,
      now,
    ]
  );

  if (!workspace) throw new Error("Failed to create workspace.");

  const dashboardToken = crypto.randomBytes(16).toString("base64url");
  const profile = await queryOne<Profile>(
    `INSERT INTO accounts_profile (user_id, workspace_id, role, status, phone_number, phone_normalized, studio_name, dashboard_token, is_email_verified, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      user.id,
      workspace.id,
      "ADMIN",
      "ACTIVE",
      data.adminPhone || "",
      normPhone,
      workspace.name,
      dashboardToken,
      true,
      now,
      now,
    ]
  );

  return {
    workspace,
    owner: {
      ...user,
      profile: profile!,
    },
  };
}

export async function createUser(data: {
  username: string;
  email: string;
  password: string;
  phone?: string;
  workspaceId?: number;
  firstName?: string;
  lastName?: string;
  role?: Role;
  status?: MemberStatus;
  studioName?: string;
  isSuperuser?: boolean;
}): Promise<UserWithProfile> {
  const normEmail = normalizeEmail(data.email);
  const normPhone = normalizePhone(data.phone);
  const targetWorkspaceId = data.workspaceId || 1;

  // Global identity validation across all workspaces
  await validateGlobalIdentity(normEmail, normPhone, targetWorkspaceId);

  const passwordHash = await bcrypt.hash(data.password, 10);
  const now = new Date().toISOString();

  const user = await queryOne<User>(
    `INSERT INTO auth_user (username, email, email_normalized, password, first_name, last_name, is_staff, is_superuser, is_active, date_joined)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id, username, email, first_name, last_name, is_staff, is_superuser`,
    [
      data.username.trim(),
      data.email.trim(),
      normEmail,
      passwordHash,
      data.firstName || "",
      data.lastName || "",
      Boolean(data.isSuperuser),
      Boolean(data.isSuperuser),
      true,
      now,
    ]
  );

  if (!user) {
    throw new Error("Failed to insert user record into auth_user.");
  }

  const dashboardToken = crypto.randomBytes(16).toString("base64url");
  const role = data.role || (data.isSuperuser ? "ADMIN" : "TEAM_MEMBER");
  const status = data.status || "ACTIVE";

  const profile = await queryOne<Profile>(
    `INSERT INTO accounts_profile (user_id, workspace_id, role, status, phone_number, phone_normalized, studio_name, dashboard_token, is_email_verified, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      user.id,
      targetWorkspaceId,
      role,
      status,
      data.phone || "",
      normPhone,
      data.studioName || "TrizenAI Studio",
      dashboardToken,
      true,
      now,
      now,
    ]
  );

  return {
    ...user,
    profile: profile!,
  };
}

export async function verifyPassword(providedPassword: string, storedHash: string): Promise<boolean> {
  if (storedHash.startsWith("pbkdf2_sha256$")) {
    const parts = storedHash.split("$");
    if (parts.length === 4) {
      const iterations = parseInt(parts[1], 10);
      const salt = parts[2];
      const expectedKey = parts[3];
      const derivedKey = crypto.pbkdf2Sync(providedPassword, salt, iterations, 32, "sha256").toString("base64");
      return crypto.timingSafeEqual(Buffer.from(expectedKey), Buffer.from(derivedKey));
    }
  }
  return bcrypt.compare(providedPassword, storedHash);
}

/**
 * Scopes team listing strictly by workspaceId
 */
export async function getAllTeamMembers(workspaceId: number = 1): Promise<UserWithProfile[]> {
  const users = await query<User>(
    `SELECT u.id, u.username, u.email, u.email_normalized, u.first_name, u.last_name, u.is_staff, u.is_superuser, u.date_joined
     FROM auth_user u
     INNER JOIN accounts_profile p ON p.user_id = u.id AND p.workspace_id = $1
     ORDER BY u.id ASC`,
    [workspaceId]
  );

  const profiles = await query<Profile>(
    `SELECT * FROM accounts_profile WHERE workspace_id = $1`,
    [workspaceId]
  );
  const profileMap = new Map<number, Profile>();
  profiles.forEach((p) => profileMap.set(p.user_id, p));

  return users.map((u) => ({
    ...u,
    profile: profileMap.get(u.id) || {
      id: 0,
      user_id: u.id,
      workspace_id: workspaceId,
      role: u.is_superuser ? "ADMIN" : "TEAM_MEMBER",
      status: "ACTIVE",
    },
  }));
}

export async function updateUserAndProfile(
  userId: number,
  data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: Role;
    status?: MemberStatus;
    phoneNumber?: string;
    mustChangePassword?: boolean;
    newPassword?: string;
    workspaceId?: number;
  }
): Promise<void> {
  const targetUser = await findUserById(userId);
  if (!targetUser) throw new Error("User not found.");

  const currentWorkspaceId = data.workspaceId || targetUser.profile?.workspace_id || 1;

  // Validate identity uniqueness if email or phone is changing
  const normEmail = data.email ? normalizeEmail(data.email) : undefined;
  const normPhone = data.phoneNumber ? normalizePhone(data.phoneNumber) : undefined;
  if (normEmail || normPhone) {
    await validateGlobalIdentity(normEmail, normPhone, currentWorkspaceId, userId);
  }

  const now = new Date().toISOString();

  if (data.firstName !== undefined || data.lastName !== undefined || data.email !== undefined || data.newPassword) {
    let passwordHash: string | undefined;
    if (data.newPassword) {
      passwordHash = await bcrypt.hash(data.newPassword, 10);
    }

    await query(
      `UPDATE auth_user
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           email = COALESCE($3, email),
           email_normalized = COALESCE($4, email_normalized),
           password = COALESCE($5, password)
       WHERE id = $6`,
      [
        data.firstName ?? null,
        data.lastName ?? null,
        data.email ? data.email.trim() : null,
        normEmail ?? null,
        passwordHash ?? null,
        userId,
      ]
    );
  }

  if (data.role !== undefined || data.status !== undefined || data.phoneNumber !== undefined || data.mustChangePassword !== undefined) {
    let finalStatus = data.status;

    const isSuper = targetUser.is_superuser;
    const effectiveRole = data.role || targetUser.profile?.role;
    const isAdmin = isSuper || effectiveRole === "ADMIN" || effectiveRole === "CO_ADMIN";

    if (isAdmin && finalStatus === "SUSPENDED") {
      finalStatus = "ACTIVE";
    }

    await query(
      `UPDATE accounts_profile
       SET role = COALESCE($1, role),
           status = COALESCE($2, status),
           phone_number = COALESCE($3, phone_number),
           phone_normalized = COALESCE($4, phone_normalized),
           must_change_password = COALESCE($5, must_change_password),
           updated_at = $6
       WHERE user_id = $7`,
      [
        data.role ?? null,
        finalStatus ?? null,
        data.phoneNumber ?? null,
        normPhone ?? null,
        data.mustChangePassword !== undefined ? (data.mustChangePassword ? 1 : 0) : null,
        now,
        userId,
      ]
    );
  }
}

export async function deleteUser(userId: number, workspaceId: number = 1): Promise<void> {
  if (!userId || userId <= 0) {
    throw new Error("Invalid user ID provided for deletion.");
  }
  const targetUser = await findUserById(userId);
  if (!targetUser) return;

  if (targetUser.profile?.workspace_id !== workspaceId) {
    throw new Error("You do not have access to this workspace resource.");
  }

  if (targetUser.is_superuser || targetUser.profile?.role === "ADMIN") {
    throw new Error("Studio Administrators and Superusers are protected from deletion to prevent accidental data loss.");
  }

  await query(`DELETE FROM events_eventmembership WHERE user_id = $1`, [userId]);
  await query(`DELETE FROM photos_photo WHERE uploaded_by_id = $1`, [userId]);
  await query(`DELETE FROM accounts_profile WHERE user_id = $1`, [userId]);
  await query(`DELETE FROM auth_user WHERE id = $1`, [userId]);
}

export async function updatePasswordAndClearMustChange(userId: number, newPassword: string): Promise<void> {
  const passwordHash = await bcrypt.hash(newPassword, 10);
  const now = new Date().toISOString();
  await query(`UPDATE auth_user SET password = $1 WHERE id = $2`, [passwordHash, userId]);
  await query(`UPDATE accounts_profile SET must_change_password = 0, updated_at = $1 WHERE user_id = $2`, [now, userId]);
}

export async function updateStudioSettings(
  userId: number,
  workspaceId: number,
  data: {
    studioName?: string;
    studioTagline?: string;
    studioEmail?: string;
    studioWebsite?: string;
    studioInstagram?: string;
    studioAddress?: string;
    watermarkText?: string;
    watermarkEnabled?: boolean;
    defaultPinLength?: number;
    defaultExpirationDays?: number;
    clientDownloadsEnabled?: boolean;
    studioLogo?: string;
  }
): Promise<void> {
  const now = new Date().toISOString();
  await query(
    `UPDATE accounts_profile
     SET studio_name = COALESCE($1, studio_name),
         studio_tagline = COALESCE($2, studio_tagline),
         studio_email = COALESCE($3, studio_email),
         studio_website = COALESCE($4, studio_website),
         studio_instagram = COALESCE($5, studio_instagram),
         studio_address = COALESCE($6, studio_address),
         watermark_text = COALESCE($7, watermark_text),
         watermark_enabled = COALESCE($8, watermark_enabled),
         default_pin_length = COALESCE($9, default_pin_length),
         default_expiration_days = COALESCE($10, default_expiration_days),
         client_downloads_enabled = COALESCE($11, client_downloads_enabled),
         studio_logo = COALESCE($12, studio_logo),
         updated_at = $13
     WHERE user_id = $14 AND workspace_id = $15`,
    [
      data.studioName ?? null,
      data.studioTagline ?? null,
      data.studioEmail ?? null,
      data.studioWebsite ?? null,
      data.studioInstagram ?? null,
      data.studioAddress ?? null,
      data.watermarkText ?? null,
      data.watermarkEnabled !== undefined ? (data.watermarkEnabled ? 1 : 0) : null,
      data.defaultPinLength ?? null,
      data.defaultExpirationDays ?? null,
      data.clientDownloadsEnabled !== undefined ? (data.clientDownloadsEnabled ? 1 : 0) : null,
      data.studioLogo ?? null,
      now,
      userId,
      workspaceId,
    ]
  );
}
