"use client";

import { useState, useTransition, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Link2, Plus, X, Search, Loader2,
  ShieldAlert, Copy, GitMerge, ArrowRight,
  ExternalLink, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
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

const LINK_TYPES: {
  value: LinkType;
  label: string;
  verb: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}[] = [
  {
    value: "BLOCKS",
    label: "Blocks",
    verb: "blocks",
    icon: ShieldAlert,
    color: "text-destructive",
    bg: "bg-destructive/10",
  },
  {
    value: "BLOCKED_BY",
    label: "Blocked by",
    verb: "is blocked by",
    icon: ShieldAlert,
    color: "text-destructive",
    bg: "bg-destructive/10",
  },
  {
    value: "DUPLICATES",
    label: "Duplicates",
    verb: "duplicates",
    icon: Copy,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    value: "RELATES_TO",
    label: "Relates to",
    verb: "relates to",
    icon: GitMerge,
    color: "text-primary",
    bg: "bg-primary/10",
  },
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

// ─── Add Link Dialog ──────────────────────────────────────────────────────────

function AddLinkDialog({
  open,
  onOpenChange,
  issueId,
  projectId,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  issueId: string;
  projectId: string;
  onAdded: (link: IssueLinkItem) => void;
}) {
  const [linkType, setLinkType]     = useState<LinkType>("RELATES_TO");
  const [query, setQuery]           = useState("");
  const [results, setResults]       = useState<IssueLinkItem["issue"][]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const searchTimer                 = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleClose() {
    setQuery("");
    setResults([]);
    setError(null);
    onOpenChange(false);
  }

  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!q.trim()) { setResults([]); return; }

    searchTimer.current = setTimeout(async () => {
      setIsSearching(true);
      const result = await searchIssuesForLink(issueId, projectId, q);
      setIsSearching(false);
      if (result.success) setResults(result.data ?? []);
    }, 200);
  }, [issueId, projectId]);

  function handleAddLink(targetIssue: IssueLinkItem["issue"]) {
    startTransition(async () => {
      setError(null);
      const result = await createIssueLink(issueId, targetIssue.id, linkType);
      if (!result.success) { setError(result.error ?? "Failed to add link."); return; }
      onAdded({ id: result.data!.id, type: linkType, issue: targetIssue });
      handleClose();
    });
  }

  const selectedTypeConfig = getLinkTypeConfig(linkType);
  const SelectedIcon = selectedTypeConfig.icon;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <Link2 className="size-4 text-primary" />
            </div>
            Add linked issue
          </DialogTitle>
          <DialogDescription>
            Link this issue to another to track dependencies and relationships.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-1">
          {/* Link type */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Relationship type</label>
            <Select value={linkType} onValueChange={(v) => setLinkType(v as LinkType)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LINK_TYPES.map(({ value, label, icon: Icon, color }) => (
                  <SelectItem key={value} value={value}>
                    <span className="flex items-center gap-2">
                      <Icon className={cn("size-3.5", color)} />
                      {label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Relationship preview */}
            <div className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-xs",
              selectedTypeConfig.bg,
            )}>
              <SelectedIcon className={cn("size-3.5 shrink-0", selectedTypeConfig.color)} />
              <span className="text-muted-foreground">
                This issue <span className={cn("font-semibold", selectedTypeConfig.color)}>
                  {selectedTypeConfig.verb}
                </span> the selected issue
              </span>
            </div>
          </div>

          {/* Search */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Search issues</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Search by title or key (e.g. TRX-42)…"
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                className="h-9 pl-9 pr-9"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>

            {/* Results */}
            <AnimatePresence>
              {results.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="flex max-h-52 flex-col overflow-y-auto rounded-xl border border-border bg-card shadow-lg"
                >
                  {results.map((issue, i) => {
                    const status   = getStatusConfig(issue.status);
                    const priority = getPriorityConfig(issue.priority);
                    const type     = getTypeConfig(issue.type);
                    const StatusIcon   = status.icon;
                    const PriorityIcon = priority.icon;
                    const TypeIcon     = type.icon;

                    return (
                      <motion.button
                        key={issue.id}
                        type="button"
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.1, delay: i * 0.03 }}
                        onClick={() => handleAddLink(issue)}
                        disabled={isPending}
                        className="flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-accent/60 disabled:opacity-50 first:rounded-t-xl last:rounded-b-xl border-b border-border/50 last:border-0"
                      >
                        <div className="flex shrink-0 items-center gap-1">
                          <PriorityIcon className={cn("size-3.5", priority.color)} />
                          <TypeIcon className={cn("size-3.5", type.color)} />
                        </div>
                        <span className="w-14 shrink-0 font-mono text-[11px] text-muted-foreground">
                          {issue.project.key}-{issue.key}
                        </span>
                        <span className="flex-1 truncate text-sm text-foreground">
                          {issue.title}
                        </span>
                        <StatusIcon className={cn("size-3.5 shrink-0", status.color)} />
                      </motion.button>
                    );
                  })}
                </motion.div>
              )}

              {query.trim() && !isSearching && results.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-border py-6 text-center"
                >
                  <Search className="size-5 text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground">No issues found for &ldquo;{query}&rdquo;</p>
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-destructive"
              >
                {error}
              </motion.p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Linked issue row ─────────────────────────────────────────────────────────

function LinkedIssueRow({
  link,
  onRemove,
  onOpen,
  isPending,
}: {
  link: IssueLinkItem;
  onRemove: (id: string) => void;
  onOpen?: (id: string) => void;
  isPending: boolean;
}) {
  const status   = getStatusConfig(link.issue.status);
  const priority = getPriorityConfig(link.issue.priority);
  const type     = getTypeConfig(link.issue.type);
  const StatusIcon   = status.icon;
  const PriorityIcon = priority.icon;
  const TypeIcon     = type.icon;
  const isDone = link.issue.status === "DONE" || link.issue.status === "CANCELLED";

  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -4, scale: 0.98 }}
      transition={{ duration: 0.15 }}
      className="group flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2 transition-colors hover:border-primary/30 hover:bg-accent/20"
    >
      {/* Type + priority icons */}
      <div className="flex shrink-0 items-center gap-1">
        <PriorityIcon className={cn("size-3.5", priority.color)} />
        <TypeIcon className={cn("size-3.5", type.color)} />
      </div>

      {/* Key + title */}
      <button
        type="button"
        onClick={() => onOpen?.(link.issue.id)}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
          {link.issue.project.key}-{link.issue.key}
        </span>
        <span className={cn(
          "flex-1 truncate text-sm font-medium transition-colors",
          isDone
            ? "line-through text-muted-foreground"
            : "text-foreground group-hover:text-primary",
        )}>
          {link.issue.title}
        </span>
      </button>

      {/* Status */}
      <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
        <StatusIcon className={cn("size-3.5", status.color)} />
        <span className="hidden sm:block">{status.label}</span>
      </div>

      {/* Open full page */}
      <a
        href={`/workspace/${link.issue.project.key}/issues/${link.issue.key}`}
        className="shrink-0 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100 hover:text-muted-foreground"
        onClick={(e) => e.stopPropagation()}
        aria-label="Open issue"
      >
        <ExternalLink className="size-3.5" />
      </a>

      {/* Remove */}
      <button
        type="button"
        onClick={() => onRemove(link.id)}
        disabled={isPending}
        className="shrink-0 text-muted-foreground/40 opacity-0 transition-all group-hover:opacity-100 hover:text-destructive disabled:opacity-30"
        aria-label="Remove link"
      >
        <X className="size-3.5" />
      </button>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function IssueLinks({ issueId, projectId, initialLinks, onOpenIssue }: IssueLinksProps) {
  const [links, setLinks]           = useState<IssueLinkItem[]>(initialLinks);
  const [isExpanded, setIsExpanded] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Group links by type
  const grouped = LINK_TYPES.reduce<Record<LinkType, IssueLinkItem[]>>(
    (acc, t) => {
      acc[t.value] = links.filter((l) => l.type === t.value);
      return acc;
    },
    { BLOCKS: [], BLOCKED_BY: [], DUPLICATES: [], RELATES_TO: [] },
  );

  const hasBlockers = grouped.BLOCKED_BY.length > 0;

  function handleAdded(link: IssueLinkItem) {
    setLinks((prev) => [...prev, link]);
  }

  function handleRemove(linkId: string) {
    startTransition(async () => {
      const result = await deleteIssueLink(linkId);
      if (result.success) {
        setLinks((prev) => prev.filter((l) => l.id !== linkId));
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsExpanded((v) => !v)}
          className="flex items-center gap-2 text-sm font-semibold text-foreground transition-colors hover:text-primary"
        >
          <motion.span
            animate={{ rotate: isExpanded ? 0 : -90 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="size-4 text-muted-foreground" />
          </motion.span>
          <Link2 className="size-4" />
          Linked issues
          {links.length > 0 && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {links.length}
            </span>
          )}
          {/* Blocker warning */}
          {hasBlockers && (
            <span className="flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
              <ShieldAlert className="size-3" />
              Blocked
            </span>
          )}
        </button>

        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground hover:text-foreground"
          onClick={() => setDialogOpen(true)}
          aria-label="Add linked issue"
          title="Add linked issue"
        >
          <Plus className="size-3.5" />
        </Button>
      </div>

      {/* Collapsible body */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {links.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-6 text-center"
              >
                <Link2 className="size-5 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">No linked issues yet.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={() => setDialogOpen(true)}
                >
                  <Plus className="size-3.5" />
                  Add link
                </Button>
              </motion.div>
            ) : (
              <div className="flex flex-col gap-4">
                <AnimatePresence initial={false}>
                  {LINK_TYPES.map(({ value, label, icon: Icon, color, bg }) => {
                    const group = grouped[value];
                    if (group.length === 0) return null;

                    return (
                      <motion.div
                        key={value}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="flex flex-col gap-1.5"
                      >
                        {/* Group label */}
                        <div className="flex items-center gap-1.5">
                          <div className={cn("flex size-4 items-center justify-center rounded", bg)}>
                            <Icon className={cn("size-2.5", color)} />
                          </div>
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {label}
                          </span>
                          <span className="text-[10px] text-muted-foreground/60">
                            ({group.length})
                          </span>
                        </div>

                        {/* Issues in group */}
                        <div className="flex flex-col gap-1">
                          <AnimatePresence initial={false}>
                            {group.map((link) => (
                              <LinkedIssueRow
                                key={link.id}
                                link={link}
                                onRemove={handleRemove}
                                onOpen={onOpenIssue}
                                isPending={isPending}
                              />
                            ))}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add link dialog */}
      <AddLinkDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        issueId={issueId}
        projectId={projectId}
        onAdded={handleAdded}
      />
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
