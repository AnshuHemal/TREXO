import type { Metadata } from "next";
import { FadeIn } from "@/components/motion/fade-in";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Changelog — Trexo",
  description: "Recent updates, features, and improvements to Trexo.",
};

const RELEASES = [
  {
    version: "v1.2.0",
    date: "August 17, 2026",
    badge: "Latest",
    title: "Unified Next.js Fullstack Architecture & Performance Optimizations",
    description: "Enhanced real-time engine, refined Kanban board interactions, streamlined OAuth, and improved security policies.",
    features: [
      "Fast, unified fullstack architecture on Next.js App Router",
      "Instant OAuth 2.0 authentication with Google and GitHub",
      "Optimized real-time SSE issue and sprint updates",
      "Comprehensive keyboard shortcuts and quick command palette",
    ],
  },
  {
    version: "v1.1.0",
    date: "July 28, 2026",
    title: "Time Tracking & Sprint Analytics",
    description: "Introduced detailed sprint reporting, velocity charts, and comprehensive time logging.",
    features: [
      "Interactive sprint velocity charts and burndown metrics",
      "Customizable issue workflows and custom field support",
      "Multi-device active session management",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <FadeIn>
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-primary">
            <Sparkles className="size-4" />
            Product Updates
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Changelog</h1>
          <p className="text-lg text-muted-foreground">New updates, improvements, and releases for Trexo.</p>
        </div>

        <div className="mt-12 space-y-12">
          {RELEASES.map((release, i) => (
            <div
              key={i}
              className="relative rounded-2xl border border-border/60 bg-card p-8 shadow-xs transition-all hover:border-border"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-base font-bold text-foreground">{release.version}</span>
                  {release.badge && (
                    <Badge variant="default" className="bg-primary text-primary-foreground">
                      {release.badge}
                    </Badge>
                  )}
                </div>
                <time className="text-sm text-muted-foreground">{release.date}</time>
              </div>

              <h2 className="mt-4 text-xl font-bold text-foreground">{release.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{release.description}</p>

              <ul className="mt-6 space-y-3">
                {release.features.map((feat, fi) => (
                  <li key={fi} className="flex items-center gap-3 text-sm text-foreground/90">
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </FadeIn>
    </div>
  );
}
