import type { Metadata } from "next";
import { FadeIn } from "@/components/motion/fade-in";
import { NotificationsForm } from "../_components/notifications-form";
import { getNotificationPrefs } from "../actions";

export const metadata: Metadata = { title: "Notification Settings" };

export default async function NotificationsSettingsPage() {
  const result = await getNotificationPrefs();
  const prefs = result.data ?? {
    assigned: true,
    mentioned: true,
    statusChanged: true,
    commentAdded: true,
  };

  return (
    <FadeIn className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Notifications</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Control exactly what you get notified about. Changes take effect immediately.
        </p>
      </div>

      <NotificationsForm initialPrefs={prefs} />
    </FadeIn>
  );
}
