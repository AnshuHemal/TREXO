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
