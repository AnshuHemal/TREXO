import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { FadeIn } from "@/components/motion/fade-in";
import { NotificationsForm } from "../_components/notifications-form";
import { DEFAULT_PREFS, type NotificationPrefs } from "./actions";

export const metadata: Metadata = { title: "Notification Settings" };

export default async function NotificationsSettingsPage() {
  const user = await requireUser();

  // Load saved prefs — fall back to defaults if none exist yet
  const saved = await prisma.notificationPreference.findUnique({
    where: { userId: user.id },
  });

  const prefs: NotificationPrefs = saved
    ? {
        assigned:      saved.assigned,
        mentioned:     saved.mentioned,
        statusChanged: saved.statusChanged,
        commentAdded:  saved.commentAdded,
      }
    : DEFAULT_PREFS;

  return (
    <FadeIn className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Notifications</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Control exactly which events trigger a notification for you.
        </p>
      </div>

      <NotificationsForm initialPrefs={prefs} />
    </FadeIn>
  );
}
