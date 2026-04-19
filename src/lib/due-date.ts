/**
 * Due date utilities — shared across backlog, board, and issue detail.
 */

const DONE_STATUSES = new Set(["DONE", "CANCELLED"]);

/** Returns true if the issue is overdue (dueDate < today and not done). */
export function isOverdue(dueDate: Date | null | undefined, status: string): boolean {
  if (!dueDate || DONE_STATUSES.has(status)) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dueDate) < today;
}

/** Returns true if the issue is due within the next 7 days (and not done). */
export function isDueThisWeek(dueDate: Date | null | undefined, status: string): boolean {
  if (!dueDate || DONE_STATUSES.has(status)) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const d = new Date(dueDate);
  return d >= today && d <= weekEnd;
}

/**
 * Returns the number of days until (positive) or since (negative) the due date.
 * Returns null if no due date.
 */
export function getDaysUntilDue(dueDate: Date | null | undefined): number | null {
  if (!dueDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dueDate);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

/**
 * Returns a human-readable due date label with urgency context.
 * e.g. "Due today", "Due tomorrow", "3 days overdue", "Due in 5 days"
 */
export function getDueDateLabel(dueDate: Date | null | undefined, status: string): string | null {
  if (!dueDate) return null;
  if (DONE_STATUSES.has(status)) return null;
  const days = getDaysUntilDue(dueDate);
  if (days === null) return null;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days === -1) return "1 day overdue";
  if (days < 0) return `${Math.abs(days)} days overdue`;
  if (days <= 7) return `Due in ${days} days`;
  return formatDueDate(dueDate);
}

/** Formats a due date for display. */
export function formatDueDate(dueDate: Date | null | undefined): string {
  if (!dueDate) return "";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dueDate));
}

/** Converts a Date to the HTML date input value format (YYYY-MM-DD). */
export function toInputDate(date: Date | null | undefined): string {
  if (!date) return "";
  return new Date(date).toISOString().split("T")[0];
}

/** Converts an HTML date input value (YYYY-MM-DD) to a Date or null. */
export function fromInputDate(value: string): Date | null {
  if (!value) return null;
  return new Date(value + "T00:00:00");
}

// ─── Issue aging ──────────────────────────────────────────────────────────────

/** Statuses that should never show aging (terminal states). */
const TERMINAL_STATUSES = new Set(["DONE", "CANCELLED", "BACKLOG"]);

/**
 * Returns the number of days an issue has been in its current status.
 * Returns null for terminal statuses (DONE, CANCELLED, BACKLOG).
 */
export function getDaysInStatus(
  statusChangedAt: Date | null | undefined,
  status: string,
): number | null {
  if (!statusChangedAt || TERMINAL_STATUSES.has(status)) return null;
  const today = new Date();
  return Math.floor((today.getTime() - new Date(statusChangedAt).getTime()) / 86_400_000);
}

export type AgingLevel = "none" | "warn" | "critical";

/**
 * Returns the aging severity level for a card.
 * - warn:     5–9 days in same status
 * - critical: 10+ days in same status
 */
export function getAgingLevel(
  statusChangedAt: Date | null | undefined,
  status: string,
  warnDays = 5,
  criticalDays = 10,
): AgingLevel {
  const days = getDaysInStatus(statusChangedAt, status);
  if (days === null) return "none";
  if (days >= criticalDays) return "critical";
  if (days >= warnDays) return "warn";
  return "none";
}

/**
 * Returns a human-readable aging label.
 * e.g. "In Progress for 8 days"
 */
export function getAgingLabel(
  statusChangedAt: Date | null | undefined,
  status: string,
): string | null {
  const days = getDaysInStatus(statusChangedAt, status);
  if (days === null) return null;
  if (days === 0) return "Since today";
  if (days === 1) return "1 day";
  return `${days} days`;
}
