import type { AcademicTerm } from "./plan";

export const PLAN_FILE_SCHEMA = "campusflow-plan";
export const PLAN_FILE_VERSION = 1;
export const MAX_PLAN_FILE_BYTES = 256 * 1024;

const MAX_TERMS = 24;
const MAX_COURSES_PER_TERM = 20;
const MAX_ID_LENGTH = 64;
const MAX_LABEL_LENGTH = 80;
const COURSE_CODE_PATTERN = /^[A-Z]{3}\d{3}[A-Z]\d$/;

interface PortablePlanDocument {
  schema: typeof PLAN_FILE_SCHEMA;
  version: typeof PLAN_FILE_VERSION;
  exportedAt: string;
  plan: {
    terms: AcademicTerm[];
  };
}

export type PlanImportResult =
  | { ok: true; terms: AcademicTerm[] }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalid(error: string): PlanImportResult {
  return { ok: false, error };
}

export function serializePlan(
  terms: readonly AcademicTerm[],
  exportedAt = new Date(),
): string {
  const document: PortablePlanDocument = {
    schema: PLAN_FILE_SCHEMA,
    version: PLAN_FILE_VERSION,
    exportedAt: exportedAt.toISOString(),
    plan: {
      terms: terms.map((term) => ({
        ...term,
        courses: [...term.courses],
      })),
    },
  };

  return `${JSON.stringify(document, null, 2)}\n`;
}

export function planExportFilename(exportedAt = new Date()): string {
  return `campusflow-plan-${exportedAt.toISOString().slice(0, 10)}.json`;
}

export function parsePlan(
  source: string,
  knownCourseCodes: ReadonlySet<string>,
): PlanImportResult {
  if (new Blob([source]).size > MAX_PLAN_FILE_BYTES) {
    return invalid("The selected file is larger than 256 KiB.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    return invalid("This file is not valid JSON.");
  }

  if (!isRecord(parsed) || parsed.schema !== PLAN_FILE_SCHEMA) {
    return invalid("This is not a CampusFlow plan file.");
  }
  if (parsed.version !== PLAN_FILE_VERSION) {
    return invalid(
      `Plan version ${String(parsed.version)} is not supported by this version of CampusFlow.`,
    );
  }
  if (
    typeof parsed.exportedAt !== "string" ||
    !Number.isFinite(Date.parse(parsed.exportedAt))
  ) {
    return invalid("The export timestamp is missing or invalid.");
  }
  if (!isRecord(parsed.plan) || !Array.isArray(parsed.plan.terms)) {
    return invalid("The plan must contain a terms array.");
  }
  if (parsed.plan.terms.length === 0 || parsed.plan.terms.length > MAX_TERMS) {
    return invalid(`A plan must contain between 1 and ${MAX_TERMS} terms.`);
  }

  const termIds = new Set<string>();
  const scheduledCourses = new Set<string>();
  const terms: AcademicTerm[] = [];

  for (const [index, value] of parsed.plan.terms.entries()) {
    if (!isRecord(value)) {
      return invalid(`Term ${index + 1} must be an object.`);
    }

    const { id, label, courses } = value;
    if (
      typeof id !== "string" ||
      id.trim() !== id ||
      id.length === 0 ||
      id.length > MAX_ID_LENGTH
    ) {
      return invalid(`Term ${index + 1} has an invalid id.`);
    }
    if (termIds.has(id)) {
      return invalid(`Term id "${id}" appears more than once.`);
    }
    if (
      typeof label !== "string" ||
      label.trim() !== label ||
      label.length === 0 ||
      label.length > MAX_LABEL_LENGTH
    ) {
      return invalid(`Term ${index + 1} has an invalid label.`);
    }
    if (!Array.isArray(courses) || courses.length > MAX_COURSES_PER_TERM) {
      return invalid(
        `Term "${label}" must contain no more than ${MAX_COURSES_PER_TERM} courses.`,
      );
    }

    const validatedCourses: string[] = [];
    for (const code of courses) {
      if (typeof code !== "string" || !COURSE_CODE_PATTERN.test(code)) {
        return invalid(`Term "${label}" contains an invalid course code.`);
      }
      if (!knownCourseCodes.has(code)) {
        return invalid(`${code} is not available in the loaded catalog.`);
      }
      if (scheduledCourses.has(code)) {
        return invalid(`${code} appears more than once in the imported plan.`);
      }
      scheduledCourses.add(code);
      validatedCourses.push(code);
    }

    termIds.add(id);
    terms.push({ id, label, courses: validatedCourses });
  }

  return { ok: true, terms };
}
