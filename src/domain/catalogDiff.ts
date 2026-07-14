import type { CatalogSnapshot } from "./catalogSnapshot";
import type { Course, CourseRequirement } from "./course";

export type CatalogImpact = "metadata" | "planning";
export type CourseField =
  | "breadth"
  | "credits"
  | "description"
  | "prerequisites"
  | "title";

export interface CourseFieldChange {
  field: CourseField;
  previous: string;
  current: string;
}

export type CatalogCourseChange =
  | {
      type: "added" | "removed";
      code: string;
      title: string;
      impact: "planning";
    }
  | {
      type: "modified";
      code: string;
      title: string;
      impact: CatalogImpact;
      fields: CourseFieldChange[];
    };

export interface CatalogDiffSummary {
  added: number;
  removed: number;
  modified: number;
  planningImpact: number;
  metadataOnly: number;
}

export interface CatalogDiff {
  previousSnapshotId: string;
  currentSnapshotId: string;
  changes: CatalogCourseChange[];
  summary: CatalogDiffSummary;
}

const FIELD_ORDER: readonly CourseField[] = [
  "title",
  "description",
  "credits",
  "breadth",
  "prerequisites",
];

function canonicalRequirement(requirement: CourseRequirement | undefined): string {
  if (!requirement) return "none";
  if (requirement.type === "course") return `course:${requirement.code}`;
  const children = requirement.requirements
    .map(canonicalRequirement)
    .sort((left, right) => left.localeCompare(right));
  return `${requirement.type}(${children.join(",")})`;
}

function displayRequirement(requirement: CourseRequirement | undefined): string {
  if (!requirement) return "None";
  if (requirement.type === "course") return requirement.code;
  const separator = requirement.type === "all" ? " and " : " or ";
  return `(${requirement.requirements.map(displayRequirement).join(separator)})`;
}

function displayField(course: Course, field: CourseField): string {
  if (field === "credits") return `${course.credits.toFixed(1)} credits`;
  if (field === "prerequisites") return displayRequirement(course.prerequisites);
  return course[field];
}

function fieldChanged(previous: Course, current: Course, field: CourseField): boolean {
  if (field === "prerequisites") {
    return canonicalRequirement(previous.prerequisites) !== canonicalRequirement(current.prerequisites);
  }
  return previous[field] !== current[field];
}

function modifiedCourse(previous: Course, current: Course): CatalogCourseChange | null {
  const fields = FIELD_ORDER
    .filter((field) => fieldChanged(previous, current, field))
    .map((field) => ({
      field,
      previous: displayField(previous, field),
      current: displayField(current, field),
    }));
  if (fields.length === 0) return null;

  const planning = fields.some(
    ({ field }) => field === "credits" || field === "prerequisites",
  );
  return {
    type: "modified",
    code: current.code,
    title: current.title,
    impact: planning ? "planning" : "metadata",
    fields,
  };
}

export function compareCatalogSnapshots(
  previous: CatalogSnapshot,
  current: CatalogSnapshot,
): CatalogDiff {
  const previousByCode = new Map(previous.courses.map((course) => [course.code, course]));
  const currentByCode = new Map(current.courses.map((course) => [course.code, course]));
  const codes = [...new Set([...previousByCode.keys(), ...currentByCode.keys()])]
    .sort((left, right) => left.localeCompare(right));
  const changes: CatalogCourseChange[] = [];

  for (const code of codes) {
    const before = previousByCode.get(code);
    const after = currentByCode.get(code);
    if (!before && after) {
      changes.push({
        type: "added",
        code,
        title: after.title,
        impact: "planning",
      });
    } else if (before && !after) {
      changes.push({
        type: "removed",
        code,
        title: before.title,
        impact: "planning",
      });
    } else if (before && after) {
      const modified = modifiedCourse(before, after);
      if (modified) changes.push(modified);
    }
  }

  return {
    previousSnapshotId: previous.snapshotId,
    currentSnapshotId: current.snapshotId,
    changes,
    summary: {
      added: changes.filter(({ type }) => type === "added").length,
      removed: changes.filter(({ type }) => type === "removed").length,
      modified: changes.filter(({ type }) => type === "modified").length,
      planningImpact: changes.filter(({ impact }) => impact === "planning").length,
      metadataOnly: changes.filter(({ impact }) => impact === "metadata").length,
    },
  };
}
