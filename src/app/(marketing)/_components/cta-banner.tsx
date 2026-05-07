"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Component ────────────────────────────────────────────────────────────────

export function CTABanner() {
  return (
    <section className="relative overflow-hidden px-6 py-24 lg:py-32">
      {/* Background glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <div className="h-[400px] w-[800px] rounded-full bg-primary/10 blur-[100px]" />
      </div>

      {/* Grid pattern */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-size-[4rem_4rem] opacity-15"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_50%,transparent_40%,var(--background)_100%)]"
      />

      <div className="relative mx-auto max-w-3xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex flex-col items-center gap-6"
        >
          {/* Headline */}
          <h2 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Ready to{" "}
            <span className="bg-linear-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              ship faster?
            </span>
          </h2>

          <p className="max-w-xl text-lg text-muted-foreground">
            Join teams that have already ditched the noise. Set up your workspace
            in minutes — no credit card required.
          </p>

          {/* CTAs */}
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <Button size="lg" asChild className="min-w-44 gap-2">
              <Link href="/signup">
                Get Started Free
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="min-w-44">
              <Link href="/login">Log in</Link>
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            No credit card required &middot; Free forever on small teams
          </p>
        </motion.div>
      </div>
    </section>
  );
}
