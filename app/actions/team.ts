"use server";

import { getCurrentUser } from "@/lib/auth/session";
import { createUser, updateUserAndProfile, deleteUser, findUserByEmail, findUserByUsername, findUserById } from "@/lib/db/users";
import { sendTeamInvitationEmail } from "@/lib/email";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

export interface TeamActionResult {
  success?: boolean;
  error?: string;
  temporaryPassword?: string;
  activationUrl?: string;
  memberEmail?: string;
  memberName?: string;
}

export async function addTeamMemberAction(formData: FormData): Promise<TeamActionResult> {
  const user = await getCurrentUser();
  if (!user || (!user.is_superuser && user.profile.role !== "ADMIN" && user.profile.role !== "CO_ADMIN")) {
    return { error: "Access denied. Only studio administrators can invite team members." };
  }

  const firstName = (formData.get("first_name") as string || "").trim();
  const lastName = (formData.get("last_name") as string || "").trim();
  const email = (formData.get("email") as string || "").trim().toLowerCase();
  const phone = (formData.get("phone") as string || "").trim();
  const role = (formData.get("role") as any || "TEAM_MEMBER");
  const sendEmail = formData.get("send_email") === "true" || formData.get("send_email") === "on";

  if (!email || !firstName) {
    return { error: "First name and email are required." };
  }

  // Check if email already exists
  const existing = await findUserByEmail(email);
  if (existing) {
    return { error: `A team member with email ${email} already exists.` };
  }

  // Generate username from email or name
  let baseUsername = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "");
  let username = baseUsername;
  let counter = 1;
  while (await findUserByUsername(username)) {
    username = `${baseUsername}${counter++}`;
  }

  // Generate high-entropy one-time temporary password (e.g. Tz-9xK2-87wQ)
  const temporaryPassword = `Tz-${crypto.randomBytes(3).toString("hex")}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;

  try {
    const newMember = await createUser({
      username,
      email,
      password: temporaryPassword,
      firstName,
      lastName,
      role,
      status: "ACTIVE",
      studioName: user.profile?.studio_name || "TrizenAI Studio",
      isSuperuser: false,
    });

    // Mark must_change_password = true and set phone number
    await updateUserAndProfile(newMember.id, {
      phoneNumber: phone,
      mustChangePassword: true,
    });

    const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const loginUrl = `${origin}/login?email=${encodeURIComponent(email)}`;

    // If requested, send email
    if (sendEmail) {
      await sendTeamInvitationEmail({
        to: email,
        recipientName: `${firstName} ${lastName}`.trim(),
        role: role === "ADMIN" ? "Studio Admin" : role === "CO_ADMIN" ? "Co-Admin" : "Photographer / Team Member",
        studioName: user.profile?.studio_name || "TrizenAI Studio",
        temporaryPassword,
        loginUrl,
      });
    }

    revalidatePath("/dashboard/team-management");
    revalidatePath("/dashboard/administrators");
    return {
      success: true,
      temporaryPassword,
      activationUrl: loginUrl,
      memberEmail: email,
      memberName: `${firstName} ${lastName}`.trim(),
    };
  } catch (err: any) {
    console.error("Add team member error:", err);
    return { error: err.message || "Failed to add team member." };
  }
}

export async function updateTeamMemberAction(memberId: number, formData: FormData): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user || (!user.is_superuser && user.profile.role !== "ADMIN" && user.profile.role !== "CO_ADMIN")) {
    return { success: false, error: "Unauthorized" };
  }

  const targetMember = await findUserById(memberId);
  if (!targetMember) {
    return { success: false, error: "Team member not found." };
  }

  const firstName = (formData.get("first_name") as string || "").trim();
  const lastName = (formData.get("last_name") as string || "").trim();
  const email = (formData.get("email") as string || "").trim().toLowerCase();
  const phone = (formData.get("phone") as string || "").trim();
  const role = formData.get("role") as any;
  let status = formData.get("status") as any;
  const resetPassword = formData.get("reset_password") === "true";

  // Rule: Studio Administrators & Co-Admins cannot be suspended (Only Team Members / Photographers can be suspended)
  const isTargetAdmin = targetMember.is_superuser || targetMember.profile?.role === "ADMIN" || targetMember.profile?.role === "CO_ADMIN";
  const isNewRoleAdmin = role === "ADMIN" || role === "CO_ADMIN";

  if (isTargetAdmin || isNewRoleAdmin) {
    if (status === "SUSPENDED") {
      return { success: false, error: "Studio Administrators and Co-Admins cannot be suspended. Only team members can be suspended." };
    }
    // If promoting to admin, ensure status is ACTIVE if it was suspended
    if (isNewRoleAdmin && targetMember.profile?.status === "SUSPENDED" && !status) {
      status = "ACTIVE";
    }
  }

  let newPassword: string | undefined;
  if (resetPassword) {
    newPassword = `Tz-${crypto.randomBytes(3).toString("hex")}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
  }

  try {
    await updateUserAndProfile(memberId, {
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      email: email || undefined,
      phoneNumber: phone,
      role: role || undefined,
      status: status || undefined,
      mustChangePassword: resetPassword ? true : undefined,
      newPassword,
    });

    revalidatePath("/dashboard/team-management");
    revalidatePath("/dashboard/administrators");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteTeamMemberAction(memberId: number): Promise<{ success: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user || (!user.is_superuser && user.profile.role !== "ADMIN")) {
    return { success: false, error: "Only super administrators can delete team members." };
  }

  if (memberId === user.id) {
    return { success: false, error: "You cannot delete your own admin account." };
  }

  try {
    await deleteUser(memberId);
    revalidatePath("/dashboard/team-management");
    revalidatePath("/dashboard/administrators");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
