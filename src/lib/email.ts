import { Resend } from "resend";
import { siteConfig } from "@/config/site";

// ─── Resend client ────────────────────────────────────────────────────────────

const resend = new Resend(process.env.RESEND_API_KEY);

/** The "from" address shown in the email client. */
const FROM = process.env.RESEND_FROM_EMAIL ?? `${siteConfig.name} <noreply@trexo.com>`;

// ─── sendOTPEmail ─────────────────────────────────────────────────────────────

interface SendOTPEmailOptions {
  to: string;
  otp: string;
  type: "email-verification" | "sign-in" | "forget-password" | "change-email";
}

/**
 * Sends a transactional OTP email via Resend.
 *
 * The email is intentionally NOT awaited at the call-site to avoid timing
 * attacks — Better Auth recommends fire-and-forget for OTP delivery.
 */
export async function sendOTPEmail({ to, otp, type }: SendOTPEmailOptions) {
  const subject = getSubject(type);
  const html = buildEmailHTML({ otp, type });

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject,
    html,
  });

  if (error) {
    // Log but don't throw — we don't want to leak email errors to the client.
    console.error("[Resend] Failed to send OTP email:", error);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSubject(type: SendOTPEmailOptions["type"]): string {
  switch (type) {
    case "email-verification":
      return `Verify your ${siteConfig.name} account`;
    case "sign-in":
      return `Your ${siteConfig.name} sign-in code`;
    case "forget-password":
      return `Reset your ${siteConfig.name} password`;
    case "change-email":
      return `Confirm your new ${siteConfig.name} email`;
  }
}

function getHeading(type: SendOTPEmailOptions["type"]): string {
  switch (type) {
    case "email-verification":
      return "Verify your email address";
    case "sign-in":
      return "Your sign-in code";
    case "forget-password":
      return "Reset your password";
    case "change-email":
      return "Confirm your new email";
  }
}

function getBody(type: SendOTPEmailOptions["type"]): string {
  switch (type) {
    case "email-verification":
      return `Enter the code below to verify your email address and activate your ${siteConfig.name} account.`;
    case "sign-in":
      return `Enter the code below to sign in to your ${siteConfig.name} account.`;
    case "forget-password":
      return `Enter the code below to reset your ${siteConfig.name} password.`;
    case "change-email":
      return `Enter the code below to confirm your new email address on your ${siteConfig.name} account.`;
  }
}

// ─── Email HTML template ──────────────────────────────────────────────────────

function buildEmailHTML({
  otp,
  type,
}: {
  otp: string;
  type: SendOTPEmailOptions["type"];
}): string {
  const heading = getHeading(type);
  const body = getBody(type);

  // Split OTP into individual characters for spaced rendering.
  const otpChars = otp.split("").join("</td><td style='padding:0 4px'>") ;

  return /* html */ `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${heading}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Inter,ui-sans-serif,system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;border:1px solid #e4e4e7;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="padding:32px 40px 24px;border-bottom:1px solid #f4f4f5;">
              <span style="font-size:22px;font-weight:800;letter-spacing:-0.5px;color:#18181b;">
                ${siteConfig.name}
              </span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#18181b;letter-spacing:-0.3px;">
                ${heading}
              </h1>
              <p style="margin:0 0 28px;font-size:14px;line-height:1.6;color:#71717a;">
                ${body}
              </p>

              <!-- OTP block -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
                <tr>
                  <td style="background:#f4f4f5;border-radius:12px;padding:16px 24px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:0 4px">
                          <span style="font-size:28px;font-weight:800;letter-spacing:6px;color:#18181b;font-family:'Courier New',monospace;">
                            ${otp}
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:13px;color:#a1a1aa;">
                This code expires in <strong style="color:#71717a;">10 minutes</strong>.
              </p>
              <p style="margin:0;font-size:13px;color:#a1a1aa;">
                If you didn't request this, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #f4f4f5;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;">
                © ${new Date().getFullYear()} ${siteConfig.name}. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
