import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { FadeIn } from "@/components/motion/fade-in";

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: `${siteConfig.name} — ${siteConfig.tagline}`,
  description: siteConfig.description,
  alternates: { canonical: "/" },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <section className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-32 text-center">

      {/* Radial glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[600px] w-[900px] rounded-full bg-primary/8 blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8">

        {/* Eyebrow badge */}
        <FadeIn direction="down" className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-4 py-1.5 text-sm font-medium text-muted-foreground backdrop-blur-sm">
          <span className="size-1.5 rounded-full bg-primary animate-pulse" />
          Now in early access
        </FadeIn>

        {/* Headline */}
        <FadeIn delay={0.1} className="flex flex-col gap-4">
          <h1 className="max-w-3xl text-5xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            {siteConfig.tagline}
          </h1>
          <p className="mx-auto max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
            {siteConfig.description}
          </p>
        </FadeIn>

        {/* CTA row */}
        <FadeIn delay={0.2} className="flex flex-col items-center gap-3 sm:flex-row">
          <Button size="lg" asChild className="min-w-40">
            <Link href="/signup">Get Started Free</Link>
          </Button>
          <Button size="lg" variant="outline" asChild className="min-w-40">
            <Link href="/login">Log in</Link>
          </Button>
        </FadeIn>

        {/* Social proof */}
        <FadeIn direction="none" delay={0.3}>
          <p className="text-sm text-muted-foreground">
            No credit card required &middot; Free forever on small teams
          </p>
        </FadeIn>

      </div>
    </section>
  );
}
