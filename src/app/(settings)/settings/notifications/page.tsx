import type { Metadata } from "next";
import { FadeIn } from "@/components/motion/fade-in";
import { NotificationsForm } from "../_components/notifications-form";

export const metadata: Metadata = { title: "Notification Settings" };

export default function NotificationsSettingsPage() {
  return (
    <FadeIn className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Notifications</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose what you want to be notified about.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <NotificationsForm />
      </div>
    </FadeIn>
  );
}
