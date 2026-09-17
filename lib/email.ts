import nodemailer from "nodemailer";

interface SendInviteEmailParams {
  to: string;
  recipientName: string;
  role: string;
  studioName: string;
  temporaryPassword: string;
  loginUrl: string;
}

export async function sendTeamInvitationEmail({
  to,
  recipientName,
  role,
  studioName,
  temporaryPassword,
  loginUrl,
}: SendInviteEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    const host = process.env.EMAIL_HOST || "smtp.gmail.com";
    const port = parseInt(process.env.EMAIL_PORT || "587", 10);
    const user = process.env.EMAIL_HOST_USER;
    const pass = process.env.EMAIL_HOST_PASSWORD;
    const from = process.env.DEFAULT_FROM_EMAIL || `TrizenAI Studio <${user || "noreply@trizenai.studio"}>`;

    if (!user || !pass) {
      console.warn("SMTP credentials not configured. Invitation email simulated.");
      return { success: true };
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; background-color: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #4f46e5; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">TrizenAI Studio</h1>
          <p style="color: #64748b; margin-top: 4px; font-size: 14px;">Professional Photography & Client Gallery Workspace</p>
        </div>
        
        <div style="background-color: #ffffff; border-radius: 12px; padding: 28px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <h2 style="color: #0f172a; margin-top: 0; font-size: 18px; font-weight: 700;">Welcome to ${studioName}, ${recipientName}!</h2>
          <p style="color: #334155; font-size: 14px; line-height: 1.6;">
            You have been invited to join <strong>${studioName}</strong> as a <strong>${role}</strong>. Below are your one-time temporary login credentials:
          </p>
          
          <div style="background-color: #f1f5f9; border-radius: 8px; padding: 16px; margin: 20px 0; border: 1px dashed #cbd5e1;">
            <p style="margin: 0 0 8px 0; font-size: 13px; color: #475569;"><strong>Email:</strong> ${to}</p>
            <p style="margin: 0; font-size: 13px; color: #475569;"><strong>Temporary Password:</strong> <code style="background-color: #e2e8f0; padding: 3px 6px; border-radius: 4px; font-size: 14px; font-family: monospace; color: #4f46e5; font-weight: bold;">${temporaryPassword}</code></p>
          </div>
          
          <p style="color: #e11d48; font-size: 12px; font-weight: 600; margin: 12px 0;">
            ⚠️ Notice: This temporary password is valid for one-time use. You will be prompted to set your personal password immediately upon your first login.
          </p>

          <div style="text-align: center; margin-top: 28px;">
            <a href="${loginUrl}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; font-weight: 600; font-size: 14px; padding: 12px 28px; border-radius: 8px; text-decoration: none; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.3);">
              Activate Account & Sign In →
            </a>
          </div>
        </div>

        <div style="text-align: center; margin-top: 24px;">
          <p style="color: #94a3b8; font-size: 11px; margin: 0;">
            TrizenAI Photo Sharing Platform • Secure Cloud Delivery
          </p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from,
      to,
      subject: `[${studioName}] Welcome to the Team - Your One-Time Login Credentials`,
      html: htmlContent,
      text: `Welcome to ${studioName}!\n\nYou have been invited as a ${role}.\n\nEmail: ${to}\nTemporary Password: ${temporaryPassword}\n\nLogin here: ${loginUrl}\n(You will be required to change your password on first login)`,
    });

    return { success: true };
  } catch (error: any) {
    console.error("Failed to send invite email via SMTP:", error);
    return { success: false, error: error.message || "Failed to send email" };
  }
}
