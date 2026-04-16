import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

/**
 * Better Auth browser client.
 *
 * Import named exports from here in Client Components:
 *   import { signIn, signUp, signOut, useSession } from "@/lib/auth-client"
 *
 * Docs: https://better-auth.com/docs/installation#create-client-instance
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [emailOTPClient()],
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
  emailOtp,
} = authClient;
