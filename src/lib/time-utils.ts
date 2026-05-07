/**
 * Pure time formatting utilities — no server code, safe to import anywhere.
 */

/** Format minutes as "Xh Ym" */
export function formatMinutes(minutes: number): string {
  if (minutes <= 0) return "0m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Parse "1h 30m", "2h", "45m", "90" (bare number = minutes) → minutes */
export function parseTimeInput(input: string): number | null {
  const s = input.trim().toLowerCase();
  if (!s) return null;

  // Bare number → minutes
  if (/^\d+$/.test(s)) return parseInt(s, 10);

  let total = 0;
  const hMatch = s.match(/(\d+)\s*h/);
  const mMatch = s.match(/(\d+)\s*m/);
  if (hMatch) total += parseInt(hMatch[1], 10) * 60;
  if (mMatch) total += parseInt(mMatch[1], 10);
  return total > 0 ? total : null;
}
