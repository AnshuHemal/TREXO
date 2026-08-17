import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";
import { sendOTPEmail } from "@/lib/email";

const OTP_LENGTH = 6;
const OTP_EXPIRES_IN = 600;
const OTP_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateOTP(): string {
  return Array.from({ length: OTP_LENGTH }, () =>
    OTP_CHARSET[Math.floor(Math.random() * OTP_CHARSET.length)],
  ).join("");
}

const getBaseURL = () => {
  const url = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (url && !url.includes("localhost")) {
    return url.replace(/\/+$/, "");
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (process.env.NODE_ENV === "production") {
    return "https://trexo-web.vercel.app";
  }
  return url || "http://localhost:3000";
};

export const auth = betterAuth({

  baseURL: getBaseURL(),

  secret:
    process.env.BETTER_AUTH_SECRET ||
    "trexo_fallback_auth_secret_aab9afd54b1c71840d2e22da0efae432c89e9d85",

  trustedOrigins: [
    "https://trexo-web.vercel.app",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.BETTER_AUTH_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
    process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined,
  ].filter(Boolean) as string[],

  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  emailAndPassword: {
    enabled: true,

    requireEmailVerification: true,
    minPasswordLength: 8,
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    },
  },

  plugins: [
    emailOTP({

      overrideDefaultEmailVerification: true,

      otpLength: OTP_LENGTH,
      expiresIn: OTP_EXPIRES_IN,

      generateOTP,

      sendVerificationOnSignUp: true,

      allowedAttempts: 5,

      resendStrategy: "reuse",

      async sendVerificationOTP({ email, otp, type }) {

        sendOTPEmail({ to: email, otp, type });
      },
    }),

    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
