import { query, queryOne } from "./index";
import type { User, Profile, Role, MemberStatus } from "@/types/database";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export interface UserWithProfile extends User {
  profile: Profile;
}

export async function findUserByEmail(email: string): Promise<UserWithProfile | null> {
  const user = await queryOne<User>(
    `SELECT * FROM auth_user WHERE LOWER(email) = LOWER($1) LIMIT 1`,
    [email.trim()]
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

export async function createUser(data: {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: Role;
  status?: MemberStatus;
  studioName?: string;
  isSuperuser?: boolean;
}): Promise<UserWithProfile> {
  const passwordHash = await bcrypt.hash(data.password, 10);
  const now = new Date().toISOString();

  const user = await queryOne<User>(
    `INSERT INTO auth_user (username, email, password, first_name, last_name, is_staff, is_superuser, is_active, date_joined)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, username, email, first_name, last_name, is_staff, is_superuser`,
    [
      data.username.trim(),
      data.email.trim(),
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
    `INSERT INTO accounts_profile (user_id, role, status, studio_name, dashboard_token, is_email_verified, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      user.id,
      role,
      status,
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
    // Django PBKDF2 hash format: pbkdf2_sha256$iterations$salt$hash
    const parts = storedHash.split("$");
    if (parts.length === 4) {
      const iterations = parseInt(parts[1], 10);
      const salt = parts[2];
      const expectedKey = parts[3];
      const derivedKey = crypto.pbkdf2Sync(providedPassword, salt, iterations, 32, "sha256").toString("base64");
      return crypto.timingSafeEqual(Buffer.from(expectedKey), Buffer.from(derivedKey));
    }
  }
  // Standard bcrypt comparison
  return bcrypt.compare(providedPassword, storedHash);
}

export async function getAllTeamMembers(): Promise<UserWithProfile[]> {
  const users = await query<User>(
    `SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.is_staff, u.is_superuser, u.date_joined
     FROM auth_user u
     ORDER BY u.id ASC`
  );

  const profiles = await query<Profile>(`SELECT * FROM accounts_profile`);
  const profileMap = new Map<number, Profile>();
  profiles.forEach((p) => profileMap.set(p.user_id, p));

  return users.map((u) => ({
    ...u,
    profile: profileMap.get(u.id) || {
      id: 0,
      user_id: u.id,
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
  }
): Promise<void> {
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
           password = COALESCE($4, password)
       WHERE id = $5`,
      [
        data.firstName ?? null,
        data.lastName ?? null,
        data.email ? data.email.trim() : null,
        passwordHash ?? null,
        userId,
      ]
    );
  }

  if (data.role !== undefined || data.status !== undefined || data.phoneNumber !== undefined || data.mustChangePassword !== undefined) {
    let finalStatus = data.status;

    // Fetch existing user/profile to enforce immunity
    const currentUser = await findUserById(userId);
    const isSuper = currentUser?.is_superuser;
    const effectiveRole = data.role || currentUser?.profile?.role;
    const isAdmin = isSuper || effectiveRole === "ADMIN" || effectiveRole === "CO_ADMIN";

    if (isAdmin && finalStatus === "SUSPENDED") {
      finalStatus = "ACTIVE";
    }

    await query(
      `UPDATE accounts_profile
       SET role = COALESCE($1, role),
           status = COALESCE($2, status),
           phone_number = COALESCE($3, phone_number),
           must_change_password = COALESCE($4, must_change_password),
           updated_at = $5
       WHERE user_id = $6`,
      [
        data.role ?? null,
        finalStatus ?? null,
        data.phoneNumber ?? null,
        data.mustChangePassword !== undefined ? (data.mustChangePassword ? 1 : 0) : null,
        now,
        userId,
      ]
    );
  }
}

export async function deleteUser(userId: number): Promise<void> {
  if (!userId || userId <= 0) {
    throw new Error("Invalid user ID provided for deletion.");
  }
  const targetUser = await findUserById(userId);
  if (!targetUser) return;

  // Accidental Data Loss Prevention: Protect Superusers & Studio Administrators from deletion
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
     WHERE user_id = $14`,
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
    ]
  );
}

