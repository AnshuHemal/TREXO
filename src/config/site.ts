/**
 * Central site configuration — single source of truth for all metadata,
 * branding, and site-wide constants.
 *
 * Import from here instead of hardcoding strings across the codebase.
 */

export const siteConfig = {
  name: "Trexo",
  tagline: "Track less. Ship more.",
  description:
    "Trexo is a modern project management platform built for teams that move fast. Organize work, track issues, and ship products — without the noise.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "https://trexo.com",
  ogImage: "/og.png",

  /** Used in <title> templates: "Page Name | Trexo" */
  titleTemplate: "%s | Trexo",

  keywords: [
    "project management",
    "issue tracker",
    "kanban board",
    "sprint planning",
    "team collaboration",
    "agile",
    "scrum",
    "task management",
    "trexo",
  ],

  author: {
    name: "Trexo",
    url: "https://trexo.com",
  },

  links: {
    github: "https://github.com/trexo-app",
    twitter: "https://twitter.com/trexo_app",
  },
} as const;

export type SiteConfig = typeof siteConfig;
