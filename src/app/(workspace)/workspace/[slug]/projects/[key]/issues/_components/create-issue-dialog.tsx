"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus, Loader2, XCircle, LayoutTemplate, ChevronDown,
  FileText, Check, Eye, Zap, Bug, BookOpen, GitBranch,
  CheckCircle2, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ISSUE_TYPES, ISSUE_STATUSES, ISSUE_PRIORITIES, getPriorityConfig, getTypeConfig } from "@/lib/issue-config";
import { createIssue } from "../actions";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Member {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

export interface IssueTemplateOption {
  id: string;
  name: string;
  description: string | null;
  type: string;
  priority: string;
  titlePrefix: string | null;
}

interface CreateIssueDialogProps {
  projectId: string;
  projectKey: string;
  workspaceSlug: string;
  members: Member[];
  templates?: IssueTemplateOption[];
  defaultStatus?: string;
  trigger?: React.ReactNode;
  onCreated?: (issueId: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// ─── Template icon map ────────────────────────────────────────────────────────

const TEMPLATE_ICONS: Record<string, React.ElementType> = {
  BUG:     Bug,
  STORY:   BookOpen,
  EPIC:    Zap,
  SUBTASK: GitBranch,
  TASK:    CheckCircle2,
};

// ─── Template picker panel ────────────────────────────────────────────────────

function TemplatePicker({
  templates,
  selectedId,
  onSelect,
  onClose,
}: {
  templates: IssueTemplateOption[];
  selectedId: string | null;
  onSelect: (tpl: IssueTemplateOption) => void;
  onClose: () => void;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const previewTpl = templates.find((t) => t.id === (hoveredId ?? selectedId));

  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.98 }}
      transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
      className="overflow-hidden rounded-xl border border-border bg-card shadow-xl"
    >
      <div className="flex">
        {/* Template list */}
        <div className="w-52 shrink-0 border-r border-border">
          <div className="border-b border-border px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Templates
            </p>
          </div>
          <div className="p-1.5">
            {templates.map((tpl) => {
              const typeCfg = getTypeConfig(tpl.type);
              const Icon = TEMPLATE_ICONS[tpl.type] ?? FileText;
              const isSelected = tpl.id === selectedId;

              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => { onSelect(tpl); onClose(); }}
                  onMouseEnter={() => setHoveredId(tpl.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                    isSelected
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-accent/60",
                  )}
                >
                  <div className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-md",
                    isSelected ? "bg-primary/20" : "bg-muted",
                  )}>
                    <Icon className={cn("size-3.5", isSelected ? "text-primary" : typeCfg.color)} />
                  </div>
                  <span className="flex-1 truncate text-sm font-medium">{tpl.name}</span>
                  {isSelected && <Check className="size-3.5 shrink-0 text-primary" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Preview panel */}
        <div className="flex-1 min-w-0">
          <div className="border-b border-border px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Preview
            </p>
          </div>
          {previewTpl ? (
            <div className="p-3">
              {/* Meta */}
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                {(() => {
                  const typeCfg = getTypeConfig(previewTpl.type);
                  const TypeIcon = typeCfg.icon;
                  return (
                    <Badge variant="outline" className={cn("gap-1 text-[10px]", typeCfg.color)}>
                      <TypeIcon className="size-2.5" />
                      {typeCfg.label}
                    </Badge>
                  );
                })()}
                {(() => {
                  const priCfg = getPriorityConfig(previewTpl.priority);
                  const PriIcon = priCfg.icon;
                  return (
                    <Badge variant="outline" className={cn("gap-1 text-[10px]", priCfg.color)}>
                      <PriIcon className="size-2.5" />
                      {priCfg.label}
                    </Badge>
                  );
                })()}
                {previewTpl.titlePrefix && (
                  <Badge variant="secondary" className="font-mono text-[10px]">
                    {previewTpl.titlePrefix}
                  </Badge>
                )}
              </div>

              {/* Description preview */}
              {previewTpl.description ? (
                <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-2.5 font-mono text-[11px] leading-relaxed text-muted-foreground">
                  {previewTpl.description}
                </pre>
              ) : (
                <div className="flex flex-col items-center gap-1.5 rounded-lg border border-dashed border-border py-6 text-center">
                  <FileText className="size-4 text-muted-foreground/40" />
                  <p className="text-[11px] text-muted-foreground">No description template</p>
                </div>
              )}

              <Button
                type="button"
                size="sm"
                className="mt-3 w-full gap-1.5 text-xs"
                onClick={() => { onSelect(previewTpl); onClose(); }}
              >
                <ArrowRight className="size-3.5" />
                Use this template
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 p-6 text-center">
              <Eye className="size-5 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">Hover a template to preview</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CreateIssueDialog({
  projectId,
  projectKey,
  workspaceSlug: _workspaceSlug,
  members,
  templates = [],
  defaultStatus = "BACKLOG",
  trigger,
  onCreated,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: CreateIssueDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [title, setTitle]               = useState("");
  const [description, setDescription]  = useState("");
  const [type, setType]                 = useState("TASK");
  const [status, setStatus]             = useState(defaultStatus);
  const [priority, setPriority]         = useState("MEDIUM");
  const [assigneeId, setAssigneeId]     = useState<string>("none");
  const [fieldErrors, setFieldErrors]   = useState<Record<string, string>>({});
  const [serverError, setServerError]   = useState<string | null>(null);
  const [isPending, startTransition]    = useTransition();

  // Template picker state
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [appliedTemplateId, setAppliedTemplateId]   = useState<string | null>(null);

  const isControlled = controlledOpen !== undefined;
  const open    = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

  function applyTemplate(tpl: IssueTemplateOption) {
    setType(tpl.type);
    setPriority(tpl.priority);
    // Apply title prefix
    if (tpl.titlePrefix) {
      setTitle((prev) => {
        if (prev.startsWith(tpl.titlePrefix!)) return prev;
        return tpl.titlePrefix + " " + prev.trimStart();
      });
    }
    // Apply description template
    if (tpl.description) {
      setDescription(tpl.description);
    }
    setAppliedTemplateId(tpl.id);
  }

  function reset() {
    setTitle("");
    setDescription("");
    setType("TASK");
    setStatus(defaultStatus);
    setPriority("MEDIUM");
    setAssigneeId("none");
    setFieldErrors({});
    setServerError(null);
    setAppliedTemplateId(null);
    setShowTemplatePicker(false);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    setOpen(next);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldErrors({});
    setServerError(null);

    startTransition(async () => {
      const result = await createIssue({
        projectId,
        title,
        type: type as never,
        status: status as never,
        priority: priority as never,
        assigneeId: assigneeId === "none" ? null : assigneeId,
        description: description.trim() || null,
      });

      if (!result.success) {
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        if (result.error) setServerError(result.error);
        return;
      }

      onCreated?.(result.data!.id);
      handleOpenChange(false);
      window.location.reload();
    });
  }

  const appliedTemplate = templates.find((t) => t.id === appliedTemplateId);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button size="sm">
              <Plus className="mr-1.5 size-4" />
              New issue
            </Button>
          )}
        </DialogTrigger>
      )}

      <DialogContent className={cn(
        "sm:max-w-lg transition-all duration-200",
        showTemplatePicker && "sm:max-w-2xl",
      )}>
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <DialogHeader>
            <DialogTitle>
              Create issue
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {projectKey}
              </span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">

            {/* Template picker */}
            {templates.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn(
                    "w-full justify-between",
                    appliedTemplate && "border-primary/40 bg-primary/5 text-primary",
                  )}
                  onClick={() => setShowTemplatePicker((v) => !v)}
                >
                  <span className="flex items-center gap-2">
                    <LayoutTemplate className="size-3.5" />
                    {appliedTemplate ? appliedTemplate.name : "Use a template"}
                  </span>
                  <motion.span
                    animate={{ rotate: showTemplatePicker ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="size-3.5" />
                  </motion.span>
                </Button>

                <AnimatePresence>
                  {showTemplatePicker && (
                    <TemplatePicker
                      templates={templates}
                      selectedId={appliedTemplateId}
                      onSelect={applyTemplate}
                      onClose={() => setShowTemplatePicker(false)}
                    />
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="issue-title">Title</Label>
              <Input
                id="issue-title"
                placeholder="Issue title"
                autoFocus
                required
                disabled={isPending}
                value={title}
                onChange={(e) => { setTitle(e.target.value); setFieldErrors((p) => ({ ...p, title: "" })); }}
                className={cn(fieldErrors.title && "border-destructive")}
              />
              <AnimatePresence mode="wait">
                {fieldErrors.title && (
                  <motion.p key="te" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-xs text-destructive">
                    {fieldErrors.title}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Description (shown when template applied or user expands) */}
            <AnimatePresence>
              {description && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="issue-desc">Description</Label>
                      <button
                        type="button"
                        onClick={() => setDescription("")}
                        className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                    <textarea
                      id="issue-desc"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={isPending}
                      rows={5}
                      placeholder="Add a description…"
                      className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Type + Status + Priority row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Type</Label>
                <Select value={type} onValueChange={setType} disabled={isPending}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ISSUE_TYPES.map(({ value, label, icon: Icon, color }) => (
                      <SelectItem key={value} value={value}>
                        <span className="flex items-center gap-2">
                          <Icon className={cn("size-3.5", color)} />
                          {label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus} disabled={isPending}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ISSUE_STATUSES.map(({ value, label, icon: Icon, color }) => (
                      <SelectItem key={value} value={value}>
                        <span className="flex items-center gap-2">
                          <Icon className={cn("size-3.5", color)} />
                          {label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={setPriority} disabled={isPending}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ISSUE_PRIORITIES.map(({ value, label, icon: Icon, color }) => (
                      <SelectItem key={value} value={value}>
                        <span className="flex items-center gap-2">
                          <Icon className={cn("size-3.5", color)} />
                          {label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Assignee */}
            <div className="flex flex-col gap-1.5">
              <Label>Assignee</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId} disabled={isPending}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <span className="flex items-center gap-2">
                        <Avatar className="size-5">
                          <AvatarImage src={m.image ?? undefined} />
                          <AvatarFallback className="text-[10px]">{getInitials(m.name)}</AvatarFallback>
                        </Avatar>
                        {m.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Server error */}
            <AnimatePresence mode="wait">
              {serverError && (
                <motion.div key="se" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  <XCircle className="size-4 shrink-0" />{serverError}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" disabled={isPending} onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!title.trim() || isPending}>
                {isPending
                  ? <span className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" />Creating…</span>
                  : "Create issue"
                }
              </Button>
            </div>
          </form>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
