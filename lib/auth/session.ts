import { cookies } from "next/headers";
import { verifySessionToken, signSessionToken, type SessionPayload } from "./jwt";
import { findUserById, type UserWithProfile } from "@/lib/db/users";

export const SESSION_COOKIE_NAME = "trizenai_session";

export async function createSessionCookie(user: UserWithProfile): Promise<string> {
  const isAdmin = user.is_superuser || user.profile.role === "ADMIN" || user.profile.role === "CO_ADMIN";
  const token = await signSessionToken({
    userId: user.id,
    username: user.username,
    email: user.email,
    role: user.profile.role,
    status: user.profile.status || "ACTIVE",
    isAdmin,
    studioName: user.profile.studio_name,
    studioLogo: user.profile.studio_logo,
    dashboardToken: user.profile.dashboard_token,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return token;
}

export async function destroySessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  return verifySessionToken(token);
}

export async function getCurrentUser(): Promise<UserWithProfile | null> {
  const session = await getSession();
  if (!session?.userId) return null;

  return findUserById(session.userId);
}

export async function requireAuth(): Promise<UserWithProfile> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

export async function requireAdmin(): Promise<UserWithProfile> {
  const user = await requireAuth();
  if (user.profile?.role !== "ADMIN" && !user.is_superuser) {
    throw new Error("FORBIDDEN");
  }
  return user;
}

export function checkMemberActive(user: UserWithProfile): { allowed: boolean; error?: string } {
  const isAdmin = Boolean(user.is_superuser || user.profile?.role === "ADMIN" || user.profile?.role === "CO_ADMIN");
  if (isAdmin) return { allowed: true };

  const status = user.profile?.status || "ACTIVE";
  if (status === "SUSPENDED") {
    return { allowed: false, error: "Your team member profile is SUSPENDED. Function access is restricted." };
  }
  if (status === "INACTIVE") {
    return { allowed: false, error: "Your team member profile is INACTIVE. Function access is restricted." };
  }
  if (status === "PENDING") {
    return { allowed: false, error: "Your team member profile is pending activation. Function access is restricted." };
  }

  return { allowed: true };
}
