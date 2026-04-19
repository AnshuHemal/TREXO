"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Type, Hash, CalendarDays, ChevronDown, Link2,
  AlertCircle, Check, Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { CustomFieldDef, CustomFieldValues } from "@/lib/custom-fields";
import { updateIssueCustomFields } from "../../settings/custom-fields/actions";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CustomFieldValuesProps {
  issueId: string;
  fields: CustomFieldDef[];
  initialValues: CustomFieldValues;
  disabled?: boolean;
}

// ─── Field icons ──────────────────────────────────────────────────────────────

const FIELD_ICONS = {
  text:     Type,
  number:   Hash,
  date:     CalendarDays,
  dropdown: ChevronDown,
  url:      Link2,
};

// ─── Single field editor ──────────────────────────────────────────────────────

function FieldEditor({
  field,
  value,
  onChange,
  disabled,
}: {
  field: CustomFieldDef;
  value: string | number | null;
  onChange: (v: string | number | null) => void;
  disabled?: boolean;
}) {
  const strVal = value != null ? String(value) : "";
  const isEmpty = value == null || strVal === "";

  switch (field.type) {
    case "text":
      return (
        <Input
          value={strVal}
          onChange={(e) => onChange(e.target.value || null)}
          placeholder="—"
          disabled={disabled}
          className="h-7 text-xs"
        />
      );

    case "number":
      return (
        <Input
          type="number"
          value={strVal}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
          placeholder="—"
          disabled={disabled}
          className="h-7 text-xs"
        />
      );

    case "date":
      return (
        <Input
          type="date"
          value={strVal}
          onChange={(e) => onChange(e.target.value || null)}
          disabled={disabled}
          className="h-7 text-xs"
        />
      );

    case "url":
      return (
        <div className="flex items-center gap-1">
          <Input
            type="url"
            value={strVal}
            onChange={(e) => onChange(e.target.value || null)}
            placeholder="https://…"
            disabled={disabled}
            className="h-7 flex-1 text-xs"
          />
          {strVal && (
            <a
              href={strVal}
              target="_blank"
              rel="noopener noreferrer"
              className="flex size-7 shrink-0 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              title="Open URL"
            >
              <Link2 className="size-3.5" />
            </a>
          )}
        </div>
      );

    case "dropdown":
      return (
        <Select
          value={strVal || "none"}
          onValueChange={(v) => onChange(v === "none" ? null : v)}
          disabled={disabled}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              <span className="text-muted-foreground">—</span>
            </SelectItem>
            {(field.options ?? []).map((opt) => (
              <SelectItem key={opt} value={opt}>
                <span className="text-xs">{opt}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    default:
      return null;
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CustomFieldValues({
  issueId,
  fields,
  initialValues,
  disabled = false,
}: CustomFieldValuesProps) {
  const [values, setValues]         = useState<CustomFieldValues>(initialValues);
  const [isPending, startTransition] = useTransition();
  const [savedField, setSavedField] = useState<string | null>(null);

  if (fields.length === 0) return null;

  function handleChange(fieldId: string, value: string | number | null) {
    const updated = { ...values, [fieldId]: value };
    setValues(updated);

    startTransition(async () => {
      await updateIssueCustomFields(issueId, updated);
      setSavedField(fieldId);
      setTimeout(() => setSavedField(null), 1500);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Custom Fields</span>
        {isPending && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
      </div>

      {fields.map((field) => {
        const Icon = FIELD_ICONS[field.type];
        const value = values[field.id] ?? null;
        const isEmpty = value == null || String(value) === "";
        const isSaved = savedField === field.id;

        return (
          <motion.div
            key={field.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-1"
          >
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5">
                <Icon className="size-3 text-muted-foreground/60" />
                <span className="text-[11px] font-medium text-muted-foreground">
                  {field.name}
                </span>
                {field.required && isEmpty && (
                  <AlertCircle className="size-3 text-amber-500" aria-label="Required" />
                )}
              </div>
              <AnimatePresence>
                {isSaved && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400"
                  >
                    <Check className="size-2.5" />
                    Saved
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            <FieldEditor
              field={field}
              value={value}
              onChange={(v) => handleChange(field.id, v)}
              disabled={disabled || isPending}
            />
          </motion.div>
        );
      })}
    </div>
  );
}
