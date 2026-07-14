import type { Course } from "./course";
import {
  describeRequirement,
  isRequirementSatisfied,
} from "./course";
import { buildCourseGraph, findCycles } from "./graph";

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
    });
  }

  for (const term of terms) {
    const validThisTerm: string[] = [];
    for (const code of term.courses) {
      const item = catalogByCode.get(code);
      if (!item) {
        issues.push({
          type: "unknown-course",
          termId: term.id,
          courseCode: code,
          message: `${code} is not in the loaded catalog.`,
        });
        continue;
      }

      if (scheduled.has(code)) {
        issues.push({
          type: "duplicate-course",
          termId: term.id,
          courseCode: code,
          message: `${code} appears more than once in the plan.`,
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
