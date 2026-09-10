/** Shared shape returned by every server action driving a form. */
export interface FormState {
  status: "idle" | "error" | "success";
  message?: string;
  /** Per-field messages, keyed by input name. */
  fields?: Record<string, string>;
  /** Echoed back so inputs keep their values after a failed submit. */
  values?: Record<string, string>;
}

export const idleForm: FormState = { status: "idle" };

export function formError(message: string, fields?: Record<string, string>, values?: Record<string, string>): FormState {
  return { status: "error", message, fields, values };
}

export function formSuccess(message: string): FormState {
  return { status: "success", message };
}

export function str(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function bool(data: FormData, key: string): boolean {
  return data.get(key) === "on" || data.get(key) === "true";
}

export function num(data: FormData, key: string): number | null {
  const raw = str(data, key);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isEmail(value: string): boolean {
  return EMAIL.test(value);
}
