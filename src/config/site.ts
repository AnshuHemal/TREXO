

export const siteConfig = {
  name: "Trexo",
  tagline: "Track less. Ship more.",

  description:
    "Trexo is a modern project management platform built for teams that move fast. Kanban boards, sprint planning, roadmaps, time tracking, and real-time collaboration — without the enterprise noise.",

  shortDescription:
    "Modern project management for fast-moving teams. Kanban, sprints, roadmaps, and real-time collaboration.",

  url: process.env.NEXT_PUBLIC_APP_URL ?? "https://trexo-web.vercel.app",

  ogImage: "/og.png",

  titleTemplate: "%s | Trexo",

  keywords: [
    "project management",
    "issue tracker",
    "kanban board",
    "sprint planning",
    "team collaboration",
    "agile project management",
    "scrum board",
    "task management",
    "roadmap planning",
    "backlog management",
    "time tracking",
    "workflow automation",
    "jira alternative",
    "linear alternative",
    "open source project management",
    "trexo",
  ],

  author: {
    name: "Trexo",
    url: "https://trexo-web.vercel.app",
  },

  links: {
    github: "https://github.com/trexo-app",
    twitter: "https://twitter.com/trexo_app",
  },

  social: {
    twitter: "https://twitter.com/trexo_app",
    github: "https://github.com/trexo-app",
  },
} as const;

export type SiteConfig = typeof siteConfig;
