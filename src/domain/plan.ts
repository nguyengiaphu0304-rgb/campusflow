import type { Course } from "./course";
import {
  describeRequirement,
  isRequirementSatisfied,
} from "./course";
import { buildCourseGraph, findCycles } from "./graph";
import { suggestPrerequisiteFix, type PlanSuggestion } from "./remediation";

export interface AcademicTerm {
  id: string;
  label: string;
  courses: string[];
}

export interface PlanIssue {
  type:
    | "catalog-cycle"
    | "duplicate-course"
    | "missing-prerequisite"
    | "unknown-course";
  termId?: string;
  courseCode?: string;
  message: string;
  suggestion: PlanSuggestion;
}

export function validatePlan(
  catalog: readonly Course[],
  terms: readonly AcademicTerm[],
): PlanIssue[] {
  const issues: PlanIssue[] = [];
  const catalogByCode = new Map(catalog.map((item) => [item.code, item]));
  const completed = new Set<string>();
  const scheduled = new Set<string>();

  for (const cycle of findCycles(buildCourseGraph(catalog))) {
    issues.push({
      type: "catalog-cycle",
      message: `Catalog cycle detected: ${cycle.join(" → ")}`,
      suggestion: {
        changeCount: null,
        message: "Review the catalog rules; plan edits cannot resolve a catalog cycle.",
      },
    });
  }

  for (const [termIndex, term] of terms.entries()) {
    const validThisTerm: string[] = [];
    for (const code of term.courses) {
      const item = catalogByCode.get(code);
      if (!item) {
        issues.push({
          type: "unknown-course",
          termId: term.id,
          courseCode: code,
          message: `${code} is not in the loaded catalog.`,
          suggestion: {
            changeCount: 1,
            message: `Remove ${code}, or load a catalog snapshot that contains it.`,
          },
        });
        continue;
      }

      if (scheduled.has(code)) {
        issues.push({
          type: "duplicate-course",
          termId: term.id,
          courseCode: code,
          message: `${code} appears more than once in the plan.`,
          suggestion: {
            changeCount: 1,
            message: `Remove this later copy of ${code} from ${term.label}.`,
          },
        });
        continue;
      }

      scheduled.add(code);
      validThisTerm.push(code);
      if (!isRequirementSatisfied(item.prerequisites, completed)) {
        issues.push({
          type: "missing-prerequisite",
          termId: term.id,
          courseCode: code,
          message: `${code} requires ${describeRequirement(item.prerequisites!) } before ${term.label}.`,
          suggestion: suggestPrerequisiteFix(
            item.prerequisites!,
            terms,
            termIndex,
            code,
            completed,
          ),
        });
      }
    }

    for (const code of validThisTerm) completed.add(code);
  }

  return issues;
}

export function totalCredits(
  catalog: readonly Course[],
  terms: readonly AcademicTerm[],
): number {
  const credits = new Map(catalog.map((item) => [item.code, item.credits]));
  const uniqueCourses = new Set(terms.flatMap((term) => term.courses));
  return [...uniqueCourses].reduce(
    (total, code) => total + (credits.get(code) ?? 0),
    0,
  );
}
