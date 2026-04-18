"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface ProjectTabsProps {
  slug: string;
  projectKey: string;
}

export function ProjectTabs({ slug, projectKey }: ProjectTabsProps) {
  const pathname = usePathname();
  const base = `/workspace/${slug}/projects/${projectKey}`;

  const tabs = [
    { label: "Board",         href: `${base}/board`,                    exact: true  },
    { label: "List",          href: `${base}/list`,                     exact: false },
    { label: "Backlog",       href: `${base}/backlog`,                   exact: false },
    { label: "Epics",         href: `${base}/epics`,                     exact: false },
    { label: "Sprints",       href: `${base}/sprints`,                   exact: false },
    { label: "Analytics",     href: `${base}/analytics`,                 exact: false },
    { label: "Health",        href: `${base}/health`,                    exact: false },
    { label: "Roadmap",       href: `${base}/roadmap`,                   exact: false },
    { label: "Settings",      href: `${base}/settings`,                  exact: true  },
    { label: "Workflow",      href: `${base}/settings/workflow`,         exact: false },
    { label: "Access",        href: `${base}/settings/access`,           exact: false },
    { label: "Notifications", href: `${base}/settings/notifications`,    exact: false },
  ];

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <div className="flex items-center gap-0 border-b border-border px-4 bg-background">
      {tabs.map(({ label, href, exact }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "px-4 py-3 text-sm font-medium transition-colors -mb-px border-b-2",
            isActive(href, exact)
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
