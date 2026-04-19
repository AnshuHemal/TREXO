"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence, Reorder } from "motion/react";
import {
  Plus, GripVertical, Trash2, Check, X, Loader2,
  Save, Type, Hash, CalendarDays, ChevronDown, Link2,
  AlertCircle, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { FadeIn } from "@/components/motion/fade-in";
import {
  type CustomFieldDef, type CustomFieldType, type CustomFieldsConfig,
  generateFieldId, FIELD_TYPE_LABELS,
} from "@/lib/custom-fields";
import { saveCustomFieldsConfig } from "../actions";

// ─── Field type icons ─────────────────────────────────────────────────────────

const TYPE_ICONS: Record<CustomFieldType, React.ElementType> = {
  text:     Type,
  number:   Hash,
  date:     CalendarDays,
  dropdown: ChevronDown,
  url:      Link2,
};

const TYPE_COLORS: Record<CustomFieldType, string> = {
  text:     "text-primary bg-primary/10",
  number:   "text-emerald-600 bg-emerald-500/10",
  date:     "text-amber-600 bg-amber-500/10",
  dropdown: "text-purple-600 bg-purple-500/10",
  url:      "text-blue-600 bg-blue-500/10",
};

// ─── Field row ────────────────────────────────────────────────────────────────

function FieldRow({
  field,
  onUpdate,
  onDelete,
}: {
  field: CustomFieldDef;
  onUpdate: (id: string, updates: Partial<CustomFieldDef>) => void;
  onDelete: (id: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [optionDraft, setOptionDraft] = useState("");
  const Icon = TYPE_ICONS[field.type];

  function addOption() {
    const trimmed = optionDraft.trim();
    if (!trimmed) return;
    onUpdate(field.id, { options: [...(field.options ?? []), trimmed] });
    setOptionDraft("");
  }

  function removeOption(opt: string) {
    onUpdate(field.id, { options: (field.options ?? []).filter((o) => o !== opt) });
  }

  return (
    <Reorder.Item
      value={field}
      id={field.id}
      className="overflow-hidden rounded-xl border border-border bg-card"
      whileDrag={{ scale: 1.01, boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
    >
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Drag handle */}
        <div className="cursor-grab text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing">
          <GripVertical className="size-4" />
        </div>

        {/* Type icon */}
        <div className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold", TYPE_COLORS[field.type])}>
          <Icon className="size-3.5" />
        </div>

        {/* Name */}
        <Input
          value={field.name}
          onChange={(e) => onUpdate(field.id, { name: e.target.value })}
          placeholder="Field name…"
          className="h-7 flex-1 border-0 bg-transparent p-0 text-sm font-medium shadow-none focus-visible:ring-0"
        />

        {/* Type selector */}
        <Select
          value={field.type}
          onValueChange={(v) => onUpdate(field.id, { type: v as CustomFieldType, options: v === "dropdown" ? (field.options ?? []) : undefined })}
        >
          <SelectTrigger className="h-7 w-32 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(FIELD_TYPE_LABELS) as CustomFieldType[]).map((t) => {
              const TIcon = TYPE_ICONS[t];
              return (
                <SelectItem key={t} value={t}>
                  <span className="flex items-center gap-2 text-xs">
                    <TIcon className="size-3.5" />
                    {FIELD_TYPE_LABELS[t]}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        {/* Required toggle */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">Required</span>
          <Switch
            checked={field.required ?? false}
            onCheckedChange={(v) => onUpdate(field.id, { required: v })}
            size="sm"
          />
        </div>

        {/* Expand (for dropdown options) */}
        {field.type === "dropdown" && (
          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            className="flex size-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <motion.span animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="size-3.5" />
            </motion.span>
          </button>
        )}

        {/* Delete */}
        <button
          type="button"
          onClick={() => onDelete(field.id)}
          className="flex size-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          title="Delete field"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>

      {/* Dropdown options */}
      <AnimatePresence>
        {field.type === "dropdown" && isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden border-t border-border bg-muted/20 px-4 py-3"
          >
            <p className="mb-2 text-xs font-medium text-muted-foreground">Options</p>
            <div className="flex flex-col gap-1.5">
              {(field.options ?? []).map((opt) => (
                <motion.div
                  key={opt}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -4 }}
                  className="flex items-center gap-2"
                >
                  <span className="flex-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-foreground">
                    {opt}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeOption(opt)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="size-3.5" />
                  </button>
                </motion.div>
              ))}
              <div className="flex items-center gap-2">
                <Input
                  value={optionDraft}
                  onChange={(e) => setOptionDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOption(); } }}
                  placeholder="Add option…"
                  className="h-7 flex-1 text-xs"
                />
                <Button size="sm" className="h-7 px-2.5 text-xs" onClick={addOption} disabled={!optionDraft.trim()}>
                  <Plus className="size-3" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface CustomFieldsEditorProps {
  projectId: string;
  initialConfig: CustomFieldsConfig;
}

export function CustomFieldsEditor({ projectId, initialConfig }: CustomFieldsEditorProps) {
  const [fields, setFields]         = useState<CustomFieldDef[]>(initialConfig.fields);
  const [isSaving, startSave]       = useTransition();
  const [saveError, setSaveError]   = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const hasChanges = JSON.stringify(fields) !== JSON.stringify(initialConfig.fields);

  function addField(type: CustomFieldType) {
    const newField: CustomFieldDef = {
      id: generateFieldId(),
      name: `${FIELD_TYPE_LABELS[type]} field`,
      type,
      order: fields.length,
      required: false,
      ...(type === "dropdown" ? { options: [] } : {}),
    };
    setFields((prev) => [...prev, newField]);
    setSaveSuccess(false);
  }

  function updateField(id: string, updates: Partial<CustomFieldDef>) {
    setFields((prev) => prev.map((f) => f.id === id ? { ...f, ...updates } : f));
    setSaveSuccess(false);
  }

  function deleteField(id: string) {
    setFields((prev) => prev.filter((f) => f.id !== id));
    setSaveSuccess(false);
  }

  function handleReorder(newOrder: CustomFieldDef[]) {
    setFields(newOrder.map((f, i) => ({ ...f, order: i })));
    setSaveSuccess(false);
  }

  function handleSave() {
    setSaveError(null);
    setSaveSuccess(false);
    startSave(async () => {
      const result = await saveCustomFieldsConfig(projectId, { fields });
      if (!result.success) {
        setSaveError(result.error ?? "Failed to save.");
        return;
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    });
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">

      {/* ── Field list ──────────────────────────────────────────────────── */}
      <FadeIn delay={0.05}>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Field definitions</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Drag to reorder. Fields appear in the issue detail sidebar.
              </p>
            </div>
            <span className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-2.5 py-1.5 text-xs text-muted-foreground">
              {fields.length} {fields.length === 1 ? "field" : "fields"}
            </span>
          </div>

          {fields.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-12 text-center">
              <div className="flex size-12 items-center justify-center rounded-xl bg-muted/60">
                <Plus className="size-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-foreground">No custom fields yet</p>
              <p className="text-xs text-muted-foreground">Add a field below to get started.</p>
            </div>
          ) : (
            <Reorder.Group
              axis="y"
              values={fields}
              onReorder={handleReorder}
              className="flex flex-col gap-2"
            >
              <AnimatePresence initial={false}>
                {fields.map((field) => (
                  <FieldRow
                    key={field.id}
                    field={field}
                    onUpdate={updateField}
                    onDelete={deleteField}
                  />
                ))}
              </AnimatePresence>
            </Reorder.Group>
          )}

          {/* Add field buttons */}
          <div className="mt-4 flex flex-wrap gap-2">
            {(Object.keys(FIELD_TYPE_LABELS) as CustomFieldType[]).map((type) => {
              const Icon = TYPE_ICONS[type];
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => addField(type)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg border border-dashed px-3 py-1.5 text-xs font-medium transition-all",
                    "border-border text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5",
                  )}
                >
                  <Plus className="size-3" />
                  <Icon className="size-3.5" />
                  {FIELD_TYPE_LABELS[type]}
                </button>
              );
            })}
          </div>
        </div>
      </FadeIn>

      {/* ── Info ────────────────────────────────────────────────────────── */}
      <FadeIn delay={0.1}>
        <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3.5">
          <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">How custom fields work</p>
            <ul className="mt-1.5 flex flex-col gap-1 text-xs text-muted-foreground">
              <li className="flex items-start gap-1.5">
                <span className="mt-1 size-1 shrink-0 rounded-full bg-muted-foreground/50" />
                Fields appear in the issue detail sidebar under "Custom Fields".
              </li>
              <li className="flex items-start gap-1.5">
                <span className="mt-1 size-1 shrink-0 rounded-full bg-muted-foreground/50" />
                Values are stored per-issue as JSON — deleting a field definition doesn't delete existing values.
              </li>
              <li className="flex items-start gap-1.5">
                <span className="mt-1 size-1 shrink-0 rounded-full bg-muted-foreground/50" />
                Required fields show a warning in the issue detail if empty.
              </li>
            </ul>
          </div>
        </div>
      </FadeIn>

      {/* ── Actions ─────────────────────────────────────────────────────── */}
      <FadeIn delay={0.15}>
        <div className="flex items-center justify-end gap-3">
          <AnimatePresence mode="wait">
            {saveError && (
              <motion.p key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="size-3.5" />{saveError}
              </motion.p>
            )}
            {saveSuccess && (
              <motion.p key="ok" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                <Check className="size-3.5" />Saved
              </motion.p>
            )}
          </AnimatePresence>

          <Button onClick={handleSave} disabled={isSaving || !hasChanges} className="gap-1.5">
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save fields
          </Button>
        </div>
      </FadeIn>
    </div>
  );
}
