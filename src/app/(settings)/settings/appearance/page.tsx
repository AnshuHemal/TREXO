import type { Metadata } from "next";
import { FadeIn } from "@/components/motion/fade-in";
import { getUserTheme } from "@/lib/theme-actions";
import { AppearanceForm } from "./_components/appearance-form";

export const metadata: Metadata = { title: "Appearance Settings" };

export default async function AppearancePage() {
  const currentTheme = await getUserTheme();

  return (
    <FadeIn className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Appearance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose how Trexo looks for you. Your preference syncs across all your devices.
        </p>
      </div>

      <AppearanceForm currentTheme={currentTheme} />
    </FadeIn>
  );
}
