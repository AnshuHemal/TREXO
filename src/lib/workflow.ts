/**
 * Workflow configuration utilities.
 *
 * Each project can override the global status labels and column order.
 * The underlying DB enum values (BACKLOG, TODO, etc.) never change —
 * only the display labels and ordering are customizable.
 */

import {
  Circle, Clock, Eye, CheckCircle2, XCircle,
  type LucideIcon,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WorkflowStatus {
  /** The DB enum value — never changes */
  value: string;
  /** Display label — customizable per project */
  label: string;
  /** Display order on the board (0 = leftmost) */
  order: number;
  /** Whether this status is enabled on the board */
  enabled: boolean;
}

export interface WorkflowTransition {
  from: string;
  to: string;
}

export interface WorkflowConfig {
  statuses: WorkflowStatus[];
  /** null = all transitions allowed */
  transitions: WorkflowTransition[] | null;
}

// ─── Default config ───────────────────────────────────────────────────────────

export const DEFAULT_WORKFLOW_STATUSES: WorkflowStatus[] = [
  { value: "BACKLOG",     label: "Backlog",     order: 0, enabled: true },
  { value: "TODO",        label: "To Do",       order: 1, enabled: true },
  { value: "IN_PROGRESS", label: "In Progress", order: 2, enabled: true },
  { value: "IN_REVIEW",   label: "In Review",   order: 3, enabled: true },
  { value: "DONE",        label: "Done",        order: 4, enabled: true },
  { value: "CANCELLED",   label: "Cancelled",   order: 5, enabled: true },
];

export const DEFAULT_WORKFLOW_CONFIG: WorkflowConfig = {
  statuses: DEFAULT_WORKFLOW_STATUSES,
  transitions: null, // all allowed
};

// ─── Status icon map ──────────────────────────────────────────────────────────

export const STATUS_ICONS_MAP: Record<string, LucideIcon> = {
  BACKLOG:     Circle,
  TODO:        Circle,
  IN_PROGRESS: Clock,
  IN_REVIEW:   Eye,
  DONE:        CheckCircle2,
  CANCELLED:   XCircle,
};

const STATUS_ICONS = STATUS_ICONS_MAP;

const STATUS_COLORS: Record<string, string> = {
  BACKLOG:     "text-muted-foreground",
  TODO:        "text-foreground",
  IN_PROGRESS: "text-primary",
  IN_REVIEW:   "text-yellow-500",
  DONE:        "text-primary",
  CANCELLED:   "text-muted-foreground",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse and validate a raw workflowConfig JSON from the database.
 * Falls back to defaults for any missing/invalid fields.
 */
export function parseWorkflowConfig(raw: unknown): WorkflowConfig {
  if (!raw || typeof raw !== "object") return DEFAULT_WORKFLOW_CONFIG;

  const obj = raw as Record<string, unknown>;

  // Parse statuses
  let statuses: WorkflowStatus[] = DEFAULT_WORKFLOW_STATUSES;
  if (Array.isArray(obj.statuses)) {
    const parsed = obj.statuses
      .filter((s): s is WorkflowStatus =>
        typeof s === "object" && s !== null &&
        typeof (s as WorkflowStatus).value === "string" &&
        typeof (s as WorkflowStatus).label === "string" &&
        typeof (s as WorkflowStatus).order === "number",
      )
      .map((s) => ({
        value:   s.value,
        label:   s.label,
        order:   s.order,
        enabled: s.enabled !== false, // default true
      }));

    // Merge with defaults — ensure all 6 statuses are present
    const merged = DEFAULT_WORKFLOW_STATUSES.map((def) => {
      const override = parsed.find((p) => p.value === def.value);
      return override ?? def;
    });
    statuses = merged.sort((a, b) => a.order - b.order);
  }

  // Parse transitions
  let transitions: WorkflowTransition[] | null = null;
  if (Array.isArray(obj.transitions)) {
    transitions = obj.transitions.filter(
      (t): t is WorkflowTransition =>
        typeof t === "object" && t !== null &&
        typeof (t as WorkflowTransition).from === "string" &&
        typeof (t as WorkflowTransition).to === "string",
    );
  }

  return { statuses, transitions };
}

/**
 * Get the display config for a status value, respecting project overrides.
 */
export function getWorkflowStatusConfig(
  value: string,
  config: WorkflowConfig,
): { value: string; label: string; icon: LucideIcon; color: string; order: number; enabled: boolean } {
  const wf = config.statuses.find((s) => s.value === value);
  return {
    value,
    label:   wf?.label   ?? value,
    icon:    STATUS_ICONS[value]  ?? Circle,
    color:   STATUS_COLORS[value] ?? "text-muted-foreground",
    order:   wf?.order   ?? 99,
    enabled: wf?.enabled ?? true,
  };
}

/**
 * Returns the ordered, enabled statuses for a project's board columns.
 */
export function getBoardColumns(config: WorkflowConfig) {
  return config.statuses
    .filter((s) => s.enabled)
    .sort((a, b) => a.order - b.order)
    .map((s) => ({
      ...s,
      icon:  STATUS_ICONS[s.value]  ?? Circle,
      color: STATUS_COLORS[s.value] ?? "text-muted-foreground",
    }));
}

/**
 * Check if a transition is allowed by the workflow config.
 * Returns true if transitions is null (all allowed).
 */
export function isTransitionAllowed(
  from: string,
  to: string,
  config: WorkflowConfig,
): boolean {
  if (!config.transitions) return true; // all allowed
  if (from === to) return true;
  return config.transitions.some((t) => t.from === from && t.to === to);
}
