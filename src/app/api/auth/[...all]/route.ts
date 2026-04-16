import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

/**
 * Better Auth catch-all route handler.
 * Handles all /api/auth/* requests (sign-in, sign-up, OAuth callbacks, etc.)
 *
 * Docs: https://better-auth.com/docs/integrations/next
 */
export const { GET, POST } = toNextJsHandler(auth);
