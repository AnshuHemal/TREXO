import { redirect } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { FadeIn } from "@/components/motion/fade-in";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { requireUser } from "@/lib/session";

/**
 * Settings layout — full-width shell with a left sidebar for tab navigation.
 * Matches the clean, minimal style of the auth pages.
 */
export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser(); // redirect to /login if not authenticated

  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Grid background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-size-[4rem_4rem] opacity-30"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_100%_60%_at_50%_0%,transparent_40%,var(--background)_100%)]"
      />

      {/* Top bar */}
      <FadeIn direction="down" className="relative z-10 flex items-center justify-between border-b border-border bg-background/80 px-6 py-4 backdrop-blur-sm">
        <Logo size={24} />
        <ThemeToggle />
      </FadeIn>

      {/* Content */}
      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 gap-8 px-6 py-10">
        {/* Sidebar nav */}
        <FadeIn direction="down" delay={0.05} className="w-48 shrink-0">
          <nav className="flex flex-col gap-1" aria-label="Settings navigation">
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Settings
            </p>
            {[
              { href: "/settings",              label: "Profile" },
              { href: "/settings/security",     label: "Security" },
              { href: "/settings/notifications", label: "Notifications" },
            ].map(({ href, label }) => (
              <SettingsNavLink key={href} href={href} label={label} />
            ))}

            <div className="my-3 h-px bg-border" />

            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              ← Back to app
            </Link>
          </nav>
        </FadeIn>

        {/* Page content */}
        <main className="flex flex-1 flex-col gap-6 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}

// ─── Nav link — needs to be a client component for active state ───────────────

import { SettingsNavLink } from "./_components/settings-nav-link";
