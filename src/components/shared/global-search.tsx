"use client";

import { useEffect, useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Search, FolderKanban, Loader2, SlidersHorizontal, X,
} from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ISSUE_STATUSES, ISSUE_PRIORITIES, ISSUE_TYPES,
  getStatusConfig, getPriorityConfig, getTypeConfig,
} from "@/lib/issue-config";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SearchIssue {
  id: string;
  key: number;
  title: string;
  status: string;
  priority: string;
  type: string;
  project: {
    id: string;
    key: string;
    name: string;
    workspace: { slug: string };
  };
  assignee: { id: string; name: string; image: string | null } | null;
}

interface SearchProject {
  id: string;
  name: string;
  key: string;
  workspace: { slug: string };
  _count: { issues: number };
}

interface SearchResults {
  issues: SearchIssue[];
  projects: SearchProject[];
}

interface Member {
  id: string;
  name: string;
  image: string | null;
}

interface GlobalSearchProps {
  workspaceId?: string;
  workspaceSlug?: string;
  projects?: { id: string; name: string; key: string }[];
  members?: Member[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function isMac() {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad/.test(navigator.platform);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GlobalSearch({
  workspaceId,
  workspaceSlug,
  projects = [],
  members = [],
}: GlobalSearchProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({ issues: [], projects: [] });
  const [isSearching, startSearchTransition] = useTransition();
  const [showFilters, setShowFilters] = useState(false);

  // ── Filters ──────────────────────────────────────────────────────────────────
  const [filterProject,  setFilterProject]  = useState("all");
  const [filterStatus,   setFilterStatus]   = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterAssignee, setFilterAssignee] = useState("all");

  const hasActiveFilters =
    filterProject !== "all" ||
    filterStatus  !== "all" ||
    filterPriority !== "all" ||
    filterAssignee !== "all";

  function clearFilters() {
    setFilterProject("all");
    setFilterStatus("all");
    setFilterPriority("all");
    setFilterAssignee("all");
  }

  // ── Keyboard shortcut ─────────────────────────────────────────────────────────

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ── Debounced search ──────────────────────────────────────────────────────────

  const doSearch = useCallback(
    (q: string) => {
      startSearchTransition(async () => {
        const params = new URLSearchParams();
        if (q)                          params.set("q", q);
        if (workspaceId)                params.set("workspaceId", workspaceId);
        if (filterProject !== "all")    params.set("projectId", filterProject);
        if (filterStatus  !== "all")    params.set("status", filterStatus);
        if (filterPriority !== "all")   params.set("priority", filterPriority);
        if (filterAssignee !== "all")   params.set("assigneeId", filterAssignee);

        const res = await fetch(`/api/search?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        }
      });
    },
    [workspaceId, filterProject, filterStatus, filterPriority, filterAssignee],
  );

  // Debounce query changes
  useEffect(() => {
    const id = setTimeout(() => doSearch(query), 250);
    return () => clearTimeout(id);
  }, [query, doSearch]);

  // Re-search when filters change
  useEffect(() => {
    if (open) doSearch(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterProject, filterStatus, filterPriority, filterAssignee]);

  // Reset on close
  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setQuery("");
      setResults({ issues: [], projects: [] });
      setShowFilters(false);
    }
  }

  // ── Navigation ────────────────────────────────────────────────────────────────

  function handleSelectIssue(issue: SearchIssue) {
    handleOpenChange(false);
    router.push(
      `/workspace/${issue.project.workspace.slug}/projects/${issue.project.key}/backlog`,
    );
  }

  function handleSelectProject(project: SearchProject) {
    handleOpenChange(false);
    router.push(`/workspace/${project.workspace.slug}/projects/${project.key}`);
  }

  const totalResults = results.issues.length + results.projects.length;
  const showEmpty = !isSearching && (query.length > 0 || hasActiveFilters) && totalResults === 0;

  return (
    <>
      {/* Trigger button — shown in topbar */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="hidden h-8 w-48 items-center justify-between gap-2 rounded-md border border-border bg-muted/40 px-3 text-xs text-muted-foreground hover:bg-muted sm:flex"
        aria-label="Open search"
      >
        <span className="flex items-center gap-2">
          <Search className="size-3.5" />
          Search issues…
        </span>
        <kbd className="pointer-events-none flex h-5 items-center gap-0.5 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          {isMac() ? "⌘" : "Ctrl"}K
        </kbd>
      </Button>

      {/* Mobile trigger */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="flex size-8 sm:hidden"
        aria-label="Open search"
      >
        <Search className="size-4" />
      </Button>

      {/* Command dialog */}
      <CommandDialog
        open={open}
        onOpenChange={handleOpenChange}
        title="Search"
        description="Search issues and projects"
        showCloseButton={false}
        className="max-w-2xl"
      >
        {/* Search input */}
        <CommandInput
          placeholder="Search issues, projects…"
          value={query}
          onValueChange={setQuery}
        />

        {/* Filter bar */}
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 gap-1.5 px-2 text-xs",
              showFilters && "bg-accent text-accent-foreground",
            )}
            onClick={() => setShowFilters((v) => !v)}
          >
            <SlidersHorizontal className="size-3.5" />
            Filters
            {hasActiveFilters && (
              <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {[filterProject, filterStatus, filterPriority, filterAssignee].filter((f) => f !== "all").length}
              </span>
            )}
          </Button>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={clearFilters}
            >
              <X className="size-3" />
              Clear
            </Button>
          )}

          {/* Loading indicator */}
          {isSearching && (
            <Loader2 className="ml-auto size-3.5 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* Filter selects */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden border-b border-border"
            >
              <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4">
                {/* Project filter */}
                {projects.length > 0 && (
                  <Select value={filterProject} onValueChange={setFilterProject}>
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All projects</SelectItem>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          <span className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] text-muted-foreground">{p.key}</span>
                            {p.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {/* Status filter */}
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {ISSUE_STATUSES.map(({ value, label, icon: Icon, color }) => (
                      <SelectItem key={value} value={value}>
                        <span className="flex items-center gap-1.5">
                          <Icon className={cn("size-3.5", color)} />{label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Priority filter */}
                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All priorities</SelectItem>
                    {ISSUE_PRIORITIES.map(({ value, label, icon: Icon, color }) => (
                      <SelectItem key={value} value={value}>
                        <span className="flex items-center gap-1.5">
                          <Icon className={cn("size-3.5", color)} />{label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Assignee filter */}
                {members.length > 0 && (
                  <Select value={filterAssignee} onValueChange={setFilterAssignee}>
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All assignees</SelectItem>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {members.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          <span className="flex items-center gap-1.5">
                            <Avatar className="size-4">
                              <AvatarImage src={m.image ?? undefined} />
                              <AvatarFallback className="text-[8px]">{getInitials(m.name)}</AvatarFallback>
                            </Avatar>
                            {m.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <CommandList className="max-h-[420px]">
          {showEmpty && (
            <CommandEmpty>
              <div className="flex flex-col items-center gap-2 py-8">
                <Search className="size-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No results found.</p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-primary underline-offset-4 hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </CommandEmpty>
          )}

          {!query && !hasActiveFilters && (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Search className="size-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                Type to search issues and projects
              </p>
              <p className="text-xs text-muted-foreground/60">
                Filter by status, priority, assignee, or project
              </p>
            </div>
          )}

          {/* Projects */}
          {results.projects.length > 0 && (
            <>
              <CommandGroup heading="Projects">
                {results.projects.map((project) => (
                  <CommandItem
                    key={project.id}
                    value={`project-${project.id}`}
                    onSelect={() => handleSelectProject(project)}
                    className="flex items-center gap-3 py-2.5"
                  >
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                      {project.key.charAt(0)}
                    </div>
                    <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                      <span className="truncate text-sm font-medium text-foreground">{project.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {project._count.issues} {project._count.issues === 1 ? "issue" : "issues"}
                      </span>
                    </div>
                    <Badge variant="outline" className="font-mono text-[10px]">{project.key}</Badge>
                  </CommandItem>
                ))}
              </CommandGroup>
              {results.issues.length > 0 && <CommandSeparator />}
            </>
          )}

          {/* Issues */}
          {results.issues.length > 0 && (
            <CommandGroup heading={`Issues (${results.issues.length})`}>
              {results.issues.map((issue) => {
                const status   = getStatusConfig(issue.status);
                const priority = getPriorityConfig(issue.priority);
                const type     = getTypeConfig(issue.type);
                const StatusIcon   = status.icon;
                const PriorityIcon = priority.icon;
                const TypeIcon     = type.icon;

                return (
                  <CommandItem
                    key={issue.id}
                    value={`issue-${issue.id}-${issue.title}`}
                    onSelect={() => handleSelectIssue(issue)}
                    className="flex items-center gap-3 py-2.5"
                  >
                    {/* Icons */}
                    <div className="flex shrink-0 items-center gap-1">
                      <PriorityIcon className={cn("size-3.5", priority.color)} />
                      <TypeIcon className={cn("size-3.5", type.color)} />
                    </div>

                    {/* Key */}
                    <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">
                      {issue.project.key}-{issue.key}
                    </span>

                    {/* Title */}
                    <span className="flex-1 truncate text-sm text-foreground">
                      {issue.title}
                    </span>

                    {/* Status */}
                    <div className="flex shrink-0 items-center gap-1.5">
                      <StatusIcon className={cn("size-3.5", status.color)} />
                      <span className="hidden text-xs text-muted-foreground sm:block">{status.label}</span>
                    </div>

                    {/* Assignee */}
                    {issue.assignee ? (
                      <Avatar className="size-5 shrink-0">
                        <AvatarImage src={issue.assignee.image ?? undefined} />
                        <AvatarFallback className="text-[9px]">{getInitials(issue.assignee.name)}</AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="size-5 shrink-0 rounded-full border border-dashed border-border" />
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}
        </CommandList>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-3 py-2">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-muted px-1 font-mono text-[10px]">↑↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-muted px-1 font-mono text-[10px]">↵</kbd>
              open
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-muted px-1 font-mono text-[10px]">esc</kbd>
              close
            </span>
          </div>
          {totalResults > 0 && (
            <span className="text-xs text-muted-foreground">
              {totalResults} result{totalResults !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </CommandDialog>
    </>
  );
}
