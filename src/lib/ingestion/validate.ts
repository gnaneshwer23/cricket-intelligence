/** Lightweight schema validation for provider payloads — no external Zod dependency. */

export type ValidationIssue = { path: string; message: string };

export type ValidationResult<T> = {
  ok: boolean;
  value?: T;
  issues: ValidationIssue[];
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function requireString(obj: Record<string, unknown>, key: string, issues: ValidationIssue[]): string | null {
  const v = obj[key];
  if (typeof v !== "string" || !v.trim()) {
    issues.push({ path: key, message: `expected non-empty string` });
    return null;
  }
  return v;
}

export function optionalString(obj: Record<string, unknown>, key: string): string | undefined {
  const v = obj[key];
  return typeof v === "string" && v.trim() ? v : undefined;
}

export function requireNumber(obj: Record<string, unknown>, key: string, issues: ValidationIssue[]): number | null {
  const v = obj[key];
  if (typeof v !== "number" || !Number.isFinite(v)) {
    issues.push({ path: key, message: `expected finite number` });
    return null;
  }
  return v;
}

export function validateCricApiMatchList(body: unknown): ValidationResult<Record<string, unknown>[]> {
  const issues: ValidationIssue[] = [];
  if (!isRecord(body)) {
    return { ok: false, issues: [{ path: "", message: "body must be object" }] };
  }
  if (body.status === "failure") {
    return {
      ok: false,
      issues: [{ path: "status", message: String(body.reason ?? "API failure") }],
    };
  }
  if (!Array.isArray(body.data)) {
    issues.push({ path: "data", message: "expected array" });
    return { ok: false, issues };
  }
  const rows: Record<string, unknown>[] = [];
  body.data.forEach((row, i) => {
    if (!isRecord(row)) {
      issues.push({ path: `data[${i}]`, message: "expected object" });
      return;
    }
    if (typeof row.id !== "string") {
      issues.push({ path: `data[${i}].id`, message: "expected string id" });
      return;
    }
    rows.push(row);
  });
  return { ok: issues.length === 0, value: rows, issues };
}

export function validateSportmonksList(body: unknown): ValidationResult<Record<string, unknown>[]> {
  const issues: ValidationIssue[] = [];
  if (!isRecord(body)) {
    return { ok: false, issues: [{ path: "", message: "body must be object" }] };
  }
  const data = body.data;
  if (!Array.isArray(data)) {
    // single fixture
    if (isRecord(data)) return { ok: true, value: [data], issues };
    return { ok: false, issues: [{ path: "data", message: "expected array or object" }] };
  }
  const rows: Record<string, unknown>[] = [];
  data.forEach((row, i) => {
    if (!isRecord(row)) {
      issues.push({ path: `data[${i}]`, message: "expected object" });
      return;
    }
    rows.push(row);
  });
  return { ok: issues.length === 0, value: rows, issues };
}

export function isRecordExport(v: unknown): v is Record<string, unknown> {
  return isRecord(v);
}
