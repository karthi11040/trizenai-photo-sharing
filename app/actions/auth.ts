"use server";

import { findUserByEmail, findUserByUsername, createUser, verifyPassword, findUserById } from "@/lib/db/users";
import { createSessionCookie, destroySessionCookie, getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";

export interface AuthActionResult {
  success?: boolean;
  error?: string;
  redirectUrl?: string;
}

export async function loginAction(formData: FormData): Promise<AuthActionResult> {
  const identifier = (formData.get("email") as string || formData.get("identifier") as string || "").trim();
  const password = (formData.get("password") as string || "").trim();

  if (!identifier || !password) {
    return { error: "Please provide your email/username and password." };
  }

  // Look up by email or username
  let user = await findUserByEmail(identifier);
  if (!user) {
    user = await findUserByUsername(identifier);
  }

  if (!user || !user.password) {
    return { error: "Invalid email/username or password." };
  }

  const isValid = await verifyPassword(password, user.password);
  if (!isValid) {
    return { error: "Invalid email/username or password." };
  }

  // Check if team member is suspended, inactive, or pending (Admins are immune)
  const isAdmin = Boolean(user.is_superuser || user.profile?.role === "ADMIN" || user.profile?.role === "CO_ADMIN");
  if (!isAdmin) {
    if (user.profile?.status === "SUSPENDED") {
      return { error: "Your team member profile is SUSPENDED. Please contact your studio administrator." };
    }
    if (user.profile?.status === "INACTIVE") {
      return { error: "Your team member profile is INACTIVE. Please contact your studio administrator to activate your profile." };
    }
    if (user.profile?.status === "PENDING") {
      return { error: "Your account is pending activation. Please complete activation or contact your studio admin." };
    }
  }

  // Create JWT session
  await createSessionCookie(user);

  // If user must change temporary password, redirect to /change-password
  if (user.profile.must_change_password) {
    return { success: true, redirectUrl: "/change-password" };
  }

  if (user.is_superuser || user.profile.role === "ADMIN" || user.profile.role === "CO_ADMIN") {
    return { success: true, redirectUrl: `/dashboard/admin/${user.profile.dashboard_token}` };
  } else {
    return { success: true, redirectUrl: "/dashboard/team" };
  }
}

export async function changePasswordAction(formData: FormData): Promise<AuthActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "You must be logged in to update your password." };
  }

  const password = (formData.get("password") as string || "").trim();
  const confirmPassword = (formData.get("confirm_password") as string || "").trim();

  if (!password || password.length < 8) {
    return { error: "Password must be at least 8 characters long." };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  try {
    const { updatePasswordAndClearMustChange } = await import("@/lib/db/users");
    await updatePasswordAndClearMustChange(user.id, password);

    const redirectUrl =
      user.is_superuser || user.profile.role === "ADMIN" || user.profile.role === "CO_ADMIN"
        ? `/dashboard/admin/${user.profile.dashboard_token}`
        : "/dashboard/team";

    return { success: true, redirectUrl };
  } catch (err: any) {
    return { error: err.message || "Failed to update password." };
  }
}

export async function registerAction(formData: FormData): Promise<AuthActionResult> {
  const firstName = (formData.get("first_name") as string || "").trim();
  const lastName = (formData.get("last_name") as string || "").trim();
  const email = (formData.get("email") as string || "").trim();
  const username = (formData.get("username") as string || email.split("@")[0] || "").trim();
  const studioName = (formData.get("studio_name") as string || "TrizenAI Studio").trim();
  const password = (formData.get("password") as string || "").trim();
  const confirmPassword = (formData.get("confirm_password") as string || "").trim();

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters long." };
  }

  if (confirmPassword && password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const existingEmail = await findUserByEmail(email);
  if (existingEmail) {
    return { error: "An account with this email already exists." };
  }

  try {
    const newUser = await createUser({
      username: username || email,
      email,
      password,
      firstName,
      lastName,
      studioName,
      role: "ADMIN",
      status: "ACTIVE",
      isSuperuser: true,
    });

    await createSessionCookie(newUser);
    return { success: true, redirectUrl: `/dashboard/admin/${newUser.profile.dashboard_token}` };
  } catch (err: any) {
    console.error("Registration error:", err);
    return { error: err.message || "Failed to register account." };
  }
}

export async function activateAction(formData: FormData): Promise<AuthActionResult> {
  const email = (formData.get("email") as string || "").trim();
  const code = (formData.get("code") as string || "").trim();

  if (!email || !code) {
    return { error: "Please enter your email and activation code." };
  }

  const user = await findUserByEmail(email);
  if (!user) {
    return { error: "No account found with this email address." };
  }

  // Update profile to ACTIVE
  await query(
    `UPDATE accounts_profile 
     SET status = 'ACTIVE', is_email_verified = true, updated_at = NOW() 
     WHERE user_id = $1`,
    [user.id]
  );

  return { success: true, redirectUrl: "/login?activated=true" };
}

export async function resetPasswordAction(formData: FormData): Promise<AuthActionResult> {
  const email = (formData.get("email") as string || "").trim();
  if (!email) {
    return { error: "Please enter your email address." };
  }

  const user = await findUserByEmail(email);
  if (!user) {
    // Return success message to avoid email enumeration
    return { success: true, redirectUrl: "/password-reset?sent=true" };
  }

  return { success: true, redirectUrl: "/password-reset?sent=true" };
}

export async function logoutAction(): Promise<void> {
  await destroySessionCookie();
  redirect("/login");
}

export async function updateStudioSettingsAction(formData: FormData): Promise<AuthActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };

  const studioName = (formData.get("studio_name") as string || "").trim();
  const firstName = (formData.get("first_name") as string || "").trim();
  const lastName = (formData.get("last_name") as string || "").trim();

  if (studioName) {
    await query(
      `UPDATE accounts_profile SET studio_name = $1, updated_at = NOW() WHERE user_id = $2`,
      [studioName, user.id]
    );
  }

  await query(
    `UPDATE auth_user SET first_name = $1, last_name = $2 WHERE id = $3`,
    [firstName, lastName, user.id]
  );

  return { success: true };
}
