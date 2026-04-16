import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";
import { sendOTPEmail } from "@/lib/email";

// ─── OTP configuration ────────────────────────────────────────────────────────

const OTP_LENGTH = 6;
const OTP_EXPIRES_IN = 600; // 10 minutes in seconds
const OTP_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // uppercase + digits, no ambiguous chars (0/O, 1/I)

/**
 * Generates a cryptographically random OTP from the allowed charset.
 * Uses Math.random() as a fallback — for production consider crypto.getRandomValues().
 */
function generateOTP(): string {
  return Array.from({ length: OTP_LENGTH }, () =>
    OTP_CHARSET[Math.floor(Math.random() * OTP_CHARSET.length)],
  ).join("");
}

// ─── Better Auth instance ─────────────────────────────────────────────────────

export const auth = betterAuth({
  // ─── Base URL ──────────────────────────────────────────────────────────────
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL,

  // ─── Secret ────────────────────────────────────────────────────────────────
  secret: process.env.BETTER_AUTH_SECRET,

  // ─── Database ──────────────────────────────────────────────────────────────
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  // ─── Email & Password ──────────────────────────────────────────────────────
  emailAndPassword: {
    enabled: true,
    // Require OTP verification before the user can sign in.
    requireEmailVerification: true,
    minPasswordLength: 8,
  },

  // ─── Social Providers ──────────────────────────────────────────────────────
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
  },

  // ─── Plugins ───────────────────────────────────────────────────────────────
  plugins: [
    emailOTP({
      // Replace the default link-based email verification with OTP.
      overrideDefaultEmailVerification: true,

      otpLength: OTP_LENGTH,
      expiresIn: OTP_EXPIRES_IN,

      // Custom generator: uppercase letters + digits, no ambiguous characters.
      generateOTP,

      // Send on every new sign-up automatically.
      sendVerificationOnSignUp: true,

      // Allow 5 attempts before the OTP is invalidated.
      allowedAttempts: 5,

      // Reuse the same OTP if the user requests a resend within the expiry
      // window — prevents multiple valid codes when emails are delayed.
      resendStrategy: "reuse",

      async sendVerificationOTP({ email, otp, type }) {
        // Fire-and-forget — do NOT await here to avoid timing attacks.
        sendOTPEmail({ to: email, otp, type });
      },
    }),

    // nextCookies MUST be last.
    nextCookies(),
  ],
});

// ─── Type helpers ─────────────────────────────────────────────────────────────

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
