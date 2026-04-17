"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus, Pencil, Trash2, Loader2, XCircle,
  FileText, ChevronDown, Check, LayoutTemplate,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ISSUE_TYPES, ISSUE_PRIORITIES, getPriorityConfig, getTypeConfig } from "@/lib/issue-config";
import {
  createTemplate, updateTemplate, deleteTemplate,
  type TemplateItem, type TemplateInput,
} from "../actions";

// ─── Props ────────────────────────────────────────────────────────────────────

interface TemplatesManagerProps {
  workspaceId: string;
  initialTemplates: TemplateItem[];
  canManage: boolean;
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border py-16 text-center"
    >
      <div className="flex size-14 items-center justify-center rounded-xl bg-muted">
        <LayoutTemplate className="size-7 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">No templates yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Create templates to speed up issue creation for your team.
        </p>
      </div>
      <Button size="sm" onClick={onAdd}>
        <Plus className="mr-1.5 size-4" />
        Create first template
      </Button>
    </motion.div>
  );
}

// ─── Template form ────────────────────────────────────────────────────────────

interface TemplateFormProps {
  initial?: TemplateItem;
  onSave: (input: TemplateInput) => Promise<void>;
  onCancel: () => void;
  isPending: boolean;
  fieldErrors: Record<string, string>;
  serverError: string | null;
}

function TemplateForm({ initial, onSave, onCancel, isPending, fieldErrors, serverError }: TemplateFormProps) {
  const [name, setName]               = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [type, setType]               = useState(initial?.type ?? "TASK");
  const [priority, setPriority]       = useState(initial?.priority ?? "MEDIUM");
  const [titlePrefix, setTitlePrefix] = useState(initial?.titlePrefix ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSave({ name, description: description || null, type, priority, titlePrefix: titlePrefix || null });
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.18 }}
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-xl border border-primary/30 bg-card p-5 shadow-sm"
    >
      <h3 className="text-sm font-semibold text-foreground">
        {initial ? "Edit template" : "New template"}
      </h3>

      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tpl-name">Template name <span className="text-destructive">*</span></Label>
        <Input
          id="tpl-name"
          autoFocus
          placeholder="e.g. Bug Report, Feature Request…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isPending}
          className={cn(fieldErrors.name && "border-destructive")}
        />
        {fieldErrors.name && (
          <p className="text-xs text-destructive">{fieldErrors.name}</p>
        )}
      </div>

      {/* Title prefix */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tpl-prefix">
          Title prefix
          <span className="ml-1.5 text-xs font-normal text-muted-foreground">(optional — prepended to the issue title)</span>
        </Label>
        <Input
          id="tpl-prefix"
          placeholder="e.g. [BUG] or [FEAT]"
          value={titlePrefix}
          onChange={(e) => setTitlePrefix(e.target.value)}
          disabled={isPending}
          className="max-w-xs"
        />
      </div>

      {/* Type + Priority */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Default type</Label>
          <Select value={type} onValueChange={setType} disabled={isPending}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ISSUE_TYPES.map(({ value, label, icon: Icon, color }) => (
                <SelectItem key={value} value={value}>
                  <span className="flex items-center gap-2">
                    <Icon className={cn("size-3.5", color)} />{label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Default priority</Label>
          <Select value={priority} onValueChange={setPriority} disabled={isPending}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ISSUE_PRIORITIES.map(({ value, label, icon: Icon, color }) => (
                <SelectItem key={value} value={value}>
                  <span className="flex items-center gap-2">
                    <Icon className={cn("size-3.5", color)} />{label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Description template */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tpl-desc">
          Description template
          <span className="ml-1.5 text-xs font-normal text-muted-foreground">(optional — pre-fills the description field)</span>
        </Label>
        <Textarea
          id="tpl-desc"
          placeholder="## Steps to reproduce&#10;1. &#10;&#10;## Expected behavior&#10;&#10;## Actual behavior"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isPending}
          rows={5}
          className="resize-none font-mono text-xs"
        />
      </div>

      {/* Server error */}
      <AnimatePresence>
        {serverError && (
          <motion.div
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
          >
            <XCircle className="size-4 shrink-0" />{serverError}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={!name.trim() || isPending}>
          {isPending
            ? <span className="flex items-center gap-2"><Loader2 className="size-3.5 animate-spin" />Saving…</span>
            : initial ? "Save changes" : "Create template"
          }
        </Button>
      </div>
    </motion.form>
  );
}

// ─── Template card ────────────────────────────────────────────────────────────

function TemplateCard({
  template,
  canManage,
  onEdit,
  onDelete,
}: {
  template: TemplateItem;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const typeCfg     = getTypeConfig(template.type);
  const priorityCfg = getPriorityConfig(template.priority);
  const TypeIcon     = typeCfg.icon;
  const PriorityIcon = priorityCfg.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.2 }}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3.5">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <FileText className="size-4 text-primary" />
        </div>

        <div className="flex flex-1 flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground truncate">{template.name}</span>
            {template.titlePrefix && (
              <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                {template.titlePrefix}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <TypeIcon className={cn("size-3", typeCfg.color)} />
              {typeCfg.label}
            </span>
            <span className="text-muted-foreground/40">·</span>
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <PriorityIcon className={cn("size-3", priorityCfg.color)} />
              {priorityCfg.label}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {template.description && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground"
              onClick={() => setExpanded((v) => !v)}
              aria-label="Toggle description"
            >
              <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown className="size-3.5" />
              </motion.span>
            </Button>
          )}
          {canManage && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-foreground"
                onClick={onEdit}
                aria-label="Edit template"
              >
                <Pencil className="size-3.5" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    aria-label="Delete template"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete template</AlertDialogTitle>
                    <AlertDialogDescription>
                      Delete <strong>{template.name}</strong>? This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <Button variant="destructive" onClick={onDelete}>Delete</Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>

      {/* Expandable description preview */}
      <AnimatePresence>
        {expanded && template.description && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border"
          >
            <pre className="whitespace-pre-wrap px-4 py-3 font-mono text-xs text-muted-foreground">
              {template.description}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TemplatesManager({ workspaceId, initialTemplates, canManage }: TemplatesManagerProps) {
  const [templates, setTemplates]   = useState<TemplateItem[]>(initialTemplates);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function resetForm() {
    setFieldErrors({});
    setServerError(null);
  }

  // ── Create ────────────────────────────────────────────────────────────────

  async function handleCreate(input: TemplateInput) {
    startTransition(async () => {
      resetForm();
      const result = await createTemplate(workspaceId, input);
      if (!result.success) {
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        if (result.error) setServerError(result.error);
        return;
      }
      setTemplates((prev) => [result.data!, ...prev]);
      setIsCreating(false);
    });
  }

  // ── Update ────────────────────────────────────────────────────────────────

  async function handleUpdate(templateId: string, input: TemplateInput) {
    startTransition(async () => {
      resetForm();
      const result = await updateTemplate(templateId, input);
      if (!result.success) {
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        if (result.error) setServerError(result.error);
        return;
      }
      setTemplates((prev) =>
        prev.map((t) => t.id === templateId ? { ...t, ...input } : t),
      );
      setEditingId(null);
    });
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  function handleDelete(templateId: string) {
    startTransition(async () => {
      await deleteTemplate(templateId);
      setTemplates((prev) => prev.filter((t) => t.id !== templateId));
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {templates.length} template{templates.length !== 1 ? "s" : ""}
          </p>
        </div>
        {canManage && !isCreating && (
          <Button size="sm" onClick={() => { setIsCreating(true); resetForm(); }}>
            <Plus className="mr-1.5 size-4" />
            New template
          </Button>
        )}
      </div>

      {/* Create form */}
      <AnimatePresence>
        {isCreating && (
          <TemplateForm
            onSave={handleCreate}
            onCancel={() => { setIsCreating(false); resetForm(); }}
            isPending={isPending}
            fieldErrors={fieldErrors}
            serverError={serverError}
          />
        )}
      </AnimatePresence>

      {/* Template list */}
      {templates.length === 0 && !isCreating ? (
        <EmptyState onAdd={() => { setIsCreating(true); resetForm(); }} />
      ) : (
        <div className="flex flex-col gap-3">
          <AnimatePresence mode="popLayout">
            {templates.map((template) => (
              editingId === template.id ? (
                <TemplateForm
                  key={template.id}
                  initial={template}
                  onSave={(input) => handleUpdate(template.id, input)}
                  onCancel={() => { setEditingId(null); resetForm(); }}
                  isPending={isPending}
                  fieldErrors={fieldErrors}
                  serverError={serverError}
                />
              ) : (
                <TemplateCard
                  key={template.id}
                  template={template}
                  canManage={canManage}
                  onEdit={() => { setEditingId(template.id); resetForm(); }}
                  onDelete={() => handleDelete(template.id)}
                />
              )
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
