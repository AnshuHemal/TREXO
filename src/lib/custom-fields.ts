/**
 * Custom Fields — type definitions and helpers.
 *
 * Custom fields are defined per-project and stored as JSON on the Project model.
 * Values are stored as JSON on the Issue model.
 */

// ─── Field types ──────────────────────────────────────────────────────────────

export type CustomFieldType = "text" | "number" | "date" | "dropdown" | "url";

export interface CustomFieldDef {
  /** Unique ID (cuid-like, generated client-side) */
  id: string;
  /** Display name shown in the UI */
  name: string;
  /** Field type */
  type: CustomFieldType;
  /** For dropdown fields: the list of options */
  options?: string[];
  /** Whether this field is required */
  required?: boolean;
  /** Display order */
  order: number;
}

export interface CustomFieldsConfig {
  fields: CustomFieldDef[];
}

/** Values stored on an issue: { [fieldId]: string | number | null } */
export type CustomFieldValues = Record<string, string | number | null>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function parseCustomFieldsConfig(raw: unknown): CustomFieldsConfig {
  if (!raw || typeof raw !== "object") return { fields: [] };
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.fields)) return { fields: [] };
  return { fields: obj.fields as CustomFieldDef[] };
}

export function parseCustomFieldValues(raw: unknown): CustomFieldValues {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as CustomFieldValues;
}

/** Generate a simple unique ID for a new field */
export function generateFieldId(): string {
  return `cf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  text:     "Text",
  number:   "Number",
  date:     "Date",
  dropdown: "Dropdown",
  url:      "URL",
};

export const FIELD_TYPE_ICONS: Record<CustomFieldType, string> = {
  text:     "T",
  number:   "#",
  date:     "📅",
  dropdown: "▾",
  url:      "🔗",
};
