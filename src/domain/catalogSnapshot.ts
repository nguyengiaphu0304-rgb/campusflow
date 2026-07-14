import type { Course, CourseRequirement } from "./course";
import { referencedCourses } from "./course";
import { buildCourseGraph, findCycles } from "./graph";

export const CATALOG_SCHEMA = "campusflow-catalog";
export const CATALOG_VERSION = 1;
export const MAX_CATALOG_FILE_BYTES = 1024 * 1024;
export const MAX_CATALOG_COURSES = 5_000;
const MAX_REQUIREMENT_DEPTH = 8;
const MAX_REQUIREMENT_NODES = 100;
const MAX_GROUP_CHILDREN = 20;
const MAX_ISSUES = 50;

export interface CatalogSource {
  name: string;
  url: string;
  retrievedAt: string;
  note: string;
}

export interface CatalogSnapshot {
  schema: typeof CATALOG_SCHEMA;
  version: typeof CATALOG_VERSION;
  snapshotId: string;
  source: CatalogSource;
  courses: Course[];
}

export interface CatalogIssue {
  code:
    | "catalog-cycle"
    | "dangling-reference"
    | "duplicate-branch"
    | "duplicate-course"
    | "invalid-document"
    | "invalid-field"
    | "self-reference"
    | "unsupported-schema"
    | "unsupported-version";
  path: string;
  message: string;
}

export type CatalogParseResult =
  | { ok: true; snapshot: CatalogSnapshot }
  | { ok: false; issues: CatalogIssue[] };

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function addIssue(
  issues: CatalogIssue[],
  issue: CatalogIssue,
): void {
  if (issues.length < MAX_ISSUES) issues.push(issue);
}

function strictString(
  value: unknown,
  path: string,
  issues: CatalogIssue[],
  maximumLength: number,
): string | undefined {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maximumLength ||
    value.trim() !== value
  ) {
    addIssue(issues, {
      code: "invalid-field",
      path,
      message: `Expected a non-empty, trimmed string of at most ${maximumLength} characters.`,
    });
    return undefined;
  }
  return value;
}

function rejectUnknownKeys(
  value: JsonRecord,
  allowed: readonly string[],
  path: string,
  issues: CatalogIssue[],
): void {
  const allowedKeys = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      addIssue(issues, {
        code: "invalid-field",
        path: `${path}.${key}`,
        message: "Unexpected field for this schema version.",
      });
    }
  }
}

function parseCourseCode(
  value: unknown,
  path: string,
  issues: CatalogIssue[],
): string | undefined {
  const code = strictString(value, path, issues, 16);
  if (code && !/^[A-Z]{3}\d{3}[HY]\d$/.test(code)) {
    addIssue(issues, {
      code: "invalid-field",
      path,
      message: "Expected a U of T course code such as CSC148H1.",
    });
    return undefined;
  }
  return code;
}

function parseRequirement(
  value: unknown,
  path: string,
  depth: number,
  budget: { nodes: number },
  issues: CatalogIssue[],
): CourseRequirement | undefined {
  budget.nodes += 1;
  if (depth > MAX_REQUIREMENT_DEPTH || budget.nodes > MAX_REQUIREMENT_NODES) {
    addIssue(issues, {
      code: "invalid-field",
      path,
      message: `Requirement trees are limited to depth ${MAX_REQUIREMENT_DEPTH} and ${MAX_REQUIREMENT_NODES} nodes per course.`,
    });
    return undefined;
  }
  if (!isRecord(value)) {
    addIssue(issues, {
      code: "invalid-field",
      path,
      message: "Expected a prerequisite rule object.",
    });
    return undefined;
  }

  if (value.type === "course") {
    rejectUnknownKeys(value, ["type", "code"], path, issues);
    const code = parseCourseCode(value.code, `${path}.code`, issues);
    return code ? { type: "course", code } : undefined;
  }
  if (value.type !== "all" && value.type !== "any") {
    addIssue(issues, {
      code: "invalid-field",
      path: `${path}.type`,
      message: "Expected prerequisite type course, all, or any.",
    });
    return undefined;
  }

  rejectUnknownKeys(value, ["type", "requirements"], path, issues);
  if (
    !Array.isArray(value.requirements) ||
    value.requirements.length === 0 ||
    value.requirements.length > MAX_GROUP_CHILDREN
  ) {
    addIssue(issues, {
      code: "invalid-field",
      path: `${path}.requirements`,
      message: `Expected between 1 and ${MAX_GROUP_CHILDREN} prerequisite rules.`,
    });
    return undefined;
  }

  const requirements = value.requirements.map((child, index) =>
    parseRequirement(child, `${path}.requirements[${index}]`, depth + 1, budget, issues),
  );
  if (requirements.some((child) => child === undefined)) return undefined;

  const signatures = new Set<string>();
  requirements.forEach((child, index) => {
    const signature = JSON.stringify(child);
    if (signatures.has(signature)) {
      addIssue(issues, {
        code: "duplicate-branch",
        path: `${path}.requirements[${index}]`,
        message: "This prerequisite branch duplicates an earlier branch.",
      });
    }
    signatures.add(signature);
  });
  return { type: value.type, requirements: requirements as CourseRequirement[] };
}

function parseCourse(
  value: unknown,
  path: string,
  issues: CatalogIssue[],
): Course | undefined {
  if (!isRecord(value)) {
    addIssue(issues, { code: "invalid-field", path, message: "Expected a course object." });
    return undefined;
  }
  rejectUnknownKeys(
    value,
    ["code", "title", "description", "credits", "breadth", "prerequisites"],
    path,
    issues,
  );
  const code = parseCourseCode(value.code, `${path}.code`, issues);
  const title = strictString(value.title, `${path}.title`, issues, 160);
  const description = strictString(value.description, `${path}.description`, issues, 1_000);
  const breadth = strictString(value.breadth, `${path}.breadth`, issues, 80);
  const credits = value.credits;
  if (
    typeof credits !== "number" ||
    !Number.isFinite(credits) ||
    credits <= 0 ||
    credits > 5 ||
    credits * 2 !== Math.round(credits * 2)
  ) {
    addIssue(issues, {
      code: "invalid-field",
      path: `${path}.credits`,
      message: "Expected credits in 0.5 increments between 0.5 and 5.0.",
    });
  }

  const prerequisites = value.prerequisites === undefined
    ? undefined
    : parseRequirement(
        value.prerequisites,
        `${path}.prerequisites`,
        1,
        { nodes: 0 },
        issues,
      );
  if (!code || !title || !description || !breadth || typeof credits !== "number") {
    return undefined;
  }
  if (value.prerequisites !== undefined && !prerequisites) return undefined;

  return prerequisites
    ? { code, title, description, credits, breadth, prerequisites }
    : { code, title, description, credits, breadth };
}

function parseSource(
  value: unknown,
  issues: CatalogIssue[],
): CatalogSource | undefined {
  if (!isRecord(value)) {
    addIssue(issues, {
      code: "invalid-field",
      path: "$.source",
      message: "Expected source provenance metadata.",
    });
    return undefined;
  }
  rejectUnknownKeys(value, ["name", "url", "retrievedAt", "note"], "$.source", issues);
  const name = strictString(value.name, "$.source.name", issues, 120);
  const url = strictString(value.url, "$.source.url", issues, 500);
  const retrievedAt = strictString(value.retrievedAt, "$.source.retrievedAt", issues, 40);
  const note = strictString(value.note, "$.source.note", issues, 500);

  if (url) {
    try {
      if (new URL(url).protocol !== "https:") throw new Error("not HTTPS");
    } catch {
      addIssue(issues, {
        code: "invalid-field",
        path: "$.source.url",
        message: "Expected an absolute HTTPS source URL.",
      });
    }
  }
  if (
    retrievedAt &&
    (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(retrievedAt) ||
      Number.isNaN(Date.parse(retrievedAt)))
  ) {
    addIssue(issues, {
      code: "invalid-field",
      path: "$.source.retrievedAt",
      message: "Expected an ISO 8601 UTC retrieval timestamp.",
    });
  }
  return name && url && retrievedAt && note ? { name, url, retrievedAt, note } : undefined;
}

export function parseCatalogSnapshot(value: unknown): CatalogParseResult {
  const issues: CatalogIssue[] = [];
  if (!isRecord(value)) {
    return {
      ok: false,
      issues: [{ code: "invalid-document", path: "$", message: "Expected a catalog object." }],
    };
  }
  rejectUnknownKeys(value, ["schema", "version", "snapshotId", "source", "courses"], "$", issues);
  if (value.schema !== CATALOG_SCHEMA) {
    addIssue(issues, {
      code: "unsupported-schema",
      path: "$.schema",
      message: `Expected schema ${CATALOG_SCHEMA}.`,
    });
  }
  if (value.version !== CATALOG_VERSION) {
    addIssue(issues, {
      code: "unsupported-version",
      path: "$.version",
      message: `Only catalog version ${CATALOG_VERSION} is supported.`,
    });
  }
  const snapshotId = strictString(value.snapshotId, "$.snapshotId", issues, 64);
  if (snapshotId && !/^[a-z0-9][a-z0-9._-]{2,63}$/.test(snapshotId)) {
    addIssue(issues, {
      code: "invalid-field",
      path: "$.snapshotId",
      message: "Expected a lowercase, URL-safe snapshot identifier.",
    });
  }
  const source = parseSource(value.source, issues);
  if (!Array.isArray(value.courses) || value.courses.length === 0 || value.courses.length > MAX_CATALOG_COURSES) {
    addIssue(issues, {
      code: "invalid-field",
      path: "$.courses",
      message: `Expected between 1 and ${MAX_CATALOG_COURSES} courses.`,
    });
    return { ok: false, issues };
  }
  const courses = value.courses.map((item, index) =>
    parseCourse(item, `$.courses[${index}]`, issues),
  );
  if (issues.length > 0 || courses.some((item) => item === undefined) || !snapshotId || !source) {
    return { ok: false, issues };
  }

  const trustedCourses = courses as Course[];
  const indexByCode = new Map<string, number>();
  for (const [index, item] of trustedCourses.entries()) {
    const previous = indexByCode.get(item.code);
    if (previous !== undefined) {
      addIssue(issues, {
        code: "duplicate-course",
        path: `$.courses[${index}].code`,
        message: `${item.code} duplicates $.courses[${previous}].code.`,
      });
    } else {
      indexByCode.set(item.code, index);
    }
  }
  for (const [index, item] of trustedCourses.entries()) {
    for (const reference of referencedCourses(item.prerequisites)) {
      if (reference === item.code) {
        addIssue(issues, {
          code: "self-reference",
          path: `$.courses[${index}].prerequisites`,
          message: `${item.code} cannot require itself.`,
        });
      } else if (!indexByCode.has(reference)) {
        addIssue(issues, {
          code: "dangling-reference",
          path: `$.courses[${index}].prerequisites`,
          message: `${item.code} references missing course ${reference}.`,
        });
      }
    }
  }
  for (const cycle of findCycles(buildCourseGraph(trustedCourses))) {
    if (cycle.length <= 2) continue;
    addIssue(issues, {
      code: "catalog-cycle",
      path: "$.courses",
      message: `Prerequisite cycle detected: ${cycle.join(" → ")}.`,
    });
  }
  if (issues.length > 0) return { ok: false, issues };

  return {
    ok: true,
    snapshot: {
      schema: CATALOG_SCHEMA,
      version: CATALOG_VERSION,
      snapshotId,
      source,
      courses: trustedCourses,
    },
  };
}

export function parseCatalogSnapshotJson(source: string): CatalogParseResult {
  if (new TextEncoder().encode(source).byteLength > MAX_CATALOG_FILE_BYTES) {
    return {
      ok: false,
      issues: [{
        code: "invalid-document",
        path: "$",
        message: "Catalog files are limited to 1 MiB.",
      }],
    };
  }
  try {
    return parseCatalogSnapshot(JSON.parse(source) as unknown);
  } catch {
    return {
      ok: false,
      issues: [{
        code: "invalid-document",
        path: "$",
        message: "Catalog file is not valid JSON.",
      }],
    };
  }
}
