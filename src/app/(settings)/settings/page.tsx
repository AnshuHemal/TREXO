import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { FadeIn } from "@/components/motion/fade-in";
import { ProfileForm } from "./_components/profile-form";

export const metadata: Metadata = { title: "Profile Settings" };

export default async function ProfileSettingsPage() {
  const user = await requireUser();

  return (
    <FadeIn className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your public profile information.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <ProfileForm
          initialName={user.name ?? ""}
          initialEmail={user.email}
          initialImage={user.image ?? null}
        />
      </div>
    </FadeIn>
  );
}
