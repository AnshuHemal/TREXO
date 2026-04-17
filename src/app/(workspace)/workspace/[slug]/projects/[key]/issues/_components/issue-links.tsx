"use client";

import { useState, useTransition, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Link2, Plus, X, ChevronDown, Search,
  Loader2, ShieldAlert, Copy, GitMerge, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getStatusConfig, getPriorityConfig, getTypeConfig } from "@/lib/issue-config";
import {
  searchIssuesForLink,
  createIssueLink,
  deleteIssueLink,
  type IssueLinkItem,
  type LinkType,
} from "../link-actions";

// ─── Link type config ─────────────────────────────────────────────────────────

const LINK_TYPES: { value: LinkType; label: string; icon: React.ElementType; color: string }[] = [
  { value: "BLOCKS",     label: "blocks",      icon: ShieldAlert, color: "text-destructive" },
  { value: "BLOCKED_BY", label: "is blocked by", icon: ShieldAlert, color: "text-destructive" },
  { value: "DUPLICATES", label: "duplicates",  icon: Copy,        color: "text-yellow-500" },
  { value: "RELATES_TO", label: "relates to",  icon: GitMerge,    color: "text-primary" },
];

function getLinkTypeConfig(type: LinkType) {
  return LINK_TYPES.find((t) => t.value === type) ?? LINK_TYPES[3];
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface IssueLinksProps {
  issueId: string;
  projectId: string;
  initialLinks: IssueLinkItem[];
  onOpenIssue?: (issueId: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function IssueLinks({ issueId, projectId, initialLinks, onOpenIssue }: IssueLinksProps) {
  const [links, setLinks]           = useState<IssueLinkItem[]>(initialLinks);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isAdding, setIsAdding]     = useState(false);
  const [linkType, setLinkType]     = useState<LinkType>("RELATES_TO");
  const [query, setQuery]           = useState("");
  const [results, setResults]       = useState<IssueLinkItem["issue"][]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const searchTimer                 = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Search ────────────────────────────────────────────────────────────────

  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!q.trim()) { setResults([]); return; }

    searchTimer.current = setTimeout(async () => {
      setIsSearching(true);
      const result = await searchIssuesForLink(issueId, projectId, q);
      setIsSearching(false);
      if (result.success) setResults(result.data ?? []);
    }, 250);
  }, [issueId, projectId]);

  // ── Add link ──────────────────────────────────────────────────────────────

  function handleAddLink(targetIssue: IssueLinkItem["issue"]) {
    startTransition(async () => {
      setError(null);
      const result = await createIssueLink(issueId, targetIssue.id, linkType);
      if (!result.success) { setError(result.error ?? "Failed to add link."); return; }

      setLinks((prev) => [
        ...prev,
        { id: result.data!.id, type: linkType, issue: targetIssue },
      ]);
      setIsAdding(false);
      setQuery("");
      setResults([]);
    });
  }

  // ── Remove link ───────────────────────────────────────────────────────────

  function handleRemoveLink(linkId: string) {
    startTransition(async () => {
      const result = await deleteIssueLink(linkId);
      if (!result.success) { setError(result.error ?? "Failed to remove link."); return; }
      setLinks((prev) => prev.filter((l) => l.id !== linkId));
    });
  }

  // ── Group links by type ───────────────────────────────────────────────────

  const grouped = LINK_TYPES.reduce<Record<LinkType, IssueLinkItem[]>>(
    (acc, t) => {
      acc[t.value] = links.filter((l) => l.type === t.value);
      return acc;
    },
    { BLOCKS: [], BLOCKED_BY: [], DUPLICATES: [], RELATES_TO: [] },
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-2">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsExpanded((v) => !v)}
          className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors"
        >
          <motion.span animate={{ rotate: isExpanded ? 0 : -90 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="size-4 text-muted-foreground" />
          </motion.span>
          <Link2 className="size-4" />
          Linked issues
          {links.length > 0 && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {links.length}
            </span>
          )}
        </button>

        <Button
          variant="ghost"
          size="icon"
          className="size-6 text-muted-foreground hover:text-foreground"
          onClick={() => { setIsAdding((v) => !v); setError(null); }}
          aria-label="Add link"
        >
          <Plus className="size-3.5" />
        </Button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-3">

              {/* Add link form */}
              <AnimatePresence>
                {isAdding && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                    className="rounded-lg border border-border bg-muted/30 p-3"
                  >
                    {/* Link type selector */}
                    <Select value={linkType} onValueChange={(v) => setLinkType(v as LinkType)}>
                      <SelectTrigger className="mb-2 h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LINK_TYPES.map(({ value, label, icon: Icon, color }) => (
                          <SelectItem key={value} value={value}>
                            <span className="flex items-center gap-2 text-xs">
                              <Icon className={cn("size-3.5", color)} />
                              {label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Search input */}
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        autoFocus
                        placeholder="Search by title or key…"
                        value={query}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="h-7 pl-8 text-xs"
                      />
                      {isSearching && (
                        <Loader2 className="absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
                      )}
                    </div>

                    {/* Search results */}
                    <AnimatePresence>
                      {results.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="mt-1.5 flex flex-col gap-0.5 rounded-md border border-border bg-popover shadow-md"
                        >
                          {results.map((issue) => {
                            const status   = getStatusConfig(issue.status);
                            const priority = getPriorityConfig(issue.priority);
                            const type     = getTypeConfig(issue.type);
                            const StatusIcon   = status.icon;
                            const PriorityIcon = priority.icon;
                            const TypeIcon     = type.icon;

                            return (
                              <button
                                key={issue.id}
                                type="button"
                                onClick={() => handleAddLink(issue)}
                                disabled={isPending}
                                className="flex items-center gap-2 px-3 py-2 text-left text-xs hover:bg-accent transition-colors first:rounded-t-md last:rounded-b-md"
                              >
                                <TypeIcon className={cn("size-3.5 shrink-0", type.color)} />
                                <span className="font-mono text-muted-foreground shrink-0">
                                  {issue.project.key}-{issue.key}
                                </span>
                                <span className="flex-1 truncate text-foreground">{issue.title}</span>
                                <StatusIcon className={cn("size-3.5 shrink-0", status.color)} />
                                <PriorityIcon className={cn("size-3.5 shrink-0", priority.color)} />
                              </button>
                            );
                          })}
                        </motion.div>
                      )}
                      {query.trim() && !isSearching && results.length === 0 && (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="mt-1.5 text-center text-xs text-muted-foreground py-2"
                        >
                          No issues found
                        </motion.p>
                      )}
                    </AnimatePresence>

                    {/* Error */}
                    {error && (
                      <p className="mt-1.5 text-xs text-destructive">{error}</p>
                    )}

                    <div className="mt-2 flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-muted-foreground"
                        onClick={() => { setIsAdding(false); setQuery(""); setResults([]); setError(null); }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Grouped link list */}
              {links.length === 0 && !isAdding ? (
                <p className="text-xs text-muted-foreground">No linked issues.</p>
              ) : (
                LINK_TYPES.map(({ value, label, icon: Icon, color }) => {
                  const group = grouped[value];
                  if (group.length === 0) return null;

                  return (
                    <div key={value} className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        <Icon className={cn("size-3", color)} />
                        <span className="text-[11px] font-medium text-muted-foreground capitalize">
                          {label}
                        </span>
                      </div>

                      {group.map((link) => {
                        const status   = getStatusConfig(link.issue.status);
                        const priority = getPriorityConfig(link.issue.priority);
                        const type     = getTypeConfig(link.issue.type);
                        const StatusIcon   = status.icon;
                        const PriorityIcon = priority.icon;
                        const TypeIcon     = type.icon;
                        const isDone = link.issue.status === "DONE" || link.issue.status === "CANCELLED";

                        return (
                          <motion.div
                            key={link.id}
                            initial={{ opacity: 0, x: -4 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -4 }}
                            transition={{ duration: 0.15 }}
                            className="group flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 hover:border-primary/30 transition-colors"
                          >
                            <TypeIcon className={cn("size-3 shrink-0", type.color)} />

                            <button
                              type="button"
                              onClick={() => onOpenIssue?.(link.issue.id)}
                              className="flex flex-1 items-center gap-1.5 min-w-0 text-left"
                            >
                              <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                                {link.issue.project.key}-{link.issue.key}
                              </span>
                              <span className={cn(
                                "flex-1 truncate text-xs font-medium",
                                isDone ? "line-through text-muted-foreground" : "text-foreground hover:text-primary",
                              )}>
                                {link.issue.title}
                              </span>
                            </button>

                            <div className="flex shrink-0 items-center gap-1">
                              <StatusIcon className={cn("size-3", status.color)} />
                              <PriorityIcon className={cn("size-3", priority.color)} />
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveLink(link.id)}
                              disabled={isPending}
                              className="ml-0.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
                              aria-label="Remove link"
                            >
                              <X className="size-3" />
                            </button>
                          </motion.div>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Blocked indicator (used on Kanban cards) ─────────────────────────────────

export function BlockedBadge() {
  return (
    <span className="flex items-center gap-0.5 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
      <ShieldAlert className="size-2.5" />
      Blocked
    </span>
  );
}

// ─── Link type label (used in activity log) ───────────────────────────────────

export function formatLinkType(type: string): string {
  const map: Record<string, string> = {
    BLOCKS:     "blocks",
    BLOCKED_BY: "is blocked by",
    DUPLICATES: "duplicates",
    RELATES_TO: "relates to",
  };
  return map[type] ?? type.toLowerCase().replace(/_/g, " ");
}
