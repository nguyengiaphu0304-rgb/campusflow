import type { CourseRequirement } from "./course";
import { isRequirementSatisfied } from "./course";

export interface TermSnapshot {
  label: string;
  courses: readonly string[];
}

export interface PlanSuggestion {
  changeCount: number | null;
  message: string;
}

function canonicalOption(courses: readonly string[]): string[] {
  return [...new Set(courses)].sort();
}

function isSubset(left: readonly string[], right: readonly string[]): boolean {
  const rightSet = new Set(right);
  return left.every((course) => rightSet.has(course));
}

function removeDominatedOptions(options: readonly string[][]): string[][] {
  const unique = new Map<string, string[]>();
  for (const option of options) {
    const canonical = canonicalOption(option);
    unique.set(canonical.join("\u0000"), canonical);
  }

  const candidates = [...unique.values()].sort((left, right) => {
    if (left.length !== right.length) return left.length - right.length;
    const leftKey = left.join("\u0000");
    const rightKey = right.join("\u0000");
    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
  });

  return candidates.filter(
    (candidate, index) =>
      !candidates.some(
        (other, otherIndex) =>
          otherIndex !== index &&
          other.length < candidate.length &&
          isSubset(other, candidate),
      ),
  );
}

function requirementOptions(
  requirement: CourseRequirement,
  completed: ReadonlySet<string>,
): string[][] {
  if (requirement.type === "course") {
    return completed.has(requirement.code) ? [[]] : [[requirement.code]];
  }

  if (requirement.type === "any") {
    return removeDominatedOptions(
      requirement.requirements.flatMap((child) =>
        requirementOptions(child, completed),
      ),
    );
  }

  let combined: string[][] = [[]];
  for (const child of requirement.requirements) {
    const childOptions = requirementOptions(child, completed);
    if (childOptions.length === 0) return [];

    combined = removeDominatedOptions(
      combined.flatMap((current) =>
        childOptions.map((option) => [...current, ...option]),
      ),
    );
  }
  return combined;
}

export function minimalMissingRequirementOptions(
  requirement: CourseRequirement,
  completed: ReadonlySet<string>,
): string[][] {
  const options = requirementOptions(requirement, completed);
  if (options.length === 0) return [];

  const minimumSize = Math.min(...options.map((option) => option.length));
  return options.filter((option) => option.length === minimumSize);
}

function earliestLaterTerm(
  requirement: CourseRequirement,
  terms: readonly TermSnapshot[],
  currentTermIndex: number,
  courseCode: string,
  completed: ReadonlySet<string>,
): string | undefined {
  const completedByBoundary = new Set(completed);

  for (let index = currentTermIndex; index < terms.length - 1; index += 1) {
    for (const code of terms[index]?.courses ?? []) {
      if (index === currentTermIndex && code === courseCode) continue;
      completedByBoundary.add(code);
    }

    if (isRequirementSatisfied(requirement, completedByBoundary)) {
      return terms[index + 1]?.label;
    }
  }
  return undefined;
}

function actionForOption(
  option: readonly string[],
  terms: readonly TermSnapshot[],
  currentTermIndex: number,
): string {
  const currentLabel = terms[currentTermIndex]?.label ?? "this term";
  return option
    .map((code) => {
      const scheduledTooLate = terms.some(
        (term, index) => index >= currentTermIndex && term.courses.includes(code),
      );
      return `${scheduledTooLate ? "move" : "add"} ${code} before ${currentLabel}`;
    })
    .join(" and ");
}

export function suggestPrerequisiteFix(
  requirement: CourseRequirement,
  terms: readonly TermSnapshot[],
  currentTermIndex: number,
  courseCode: string,
  completed: ReadonlySet<string>,
): PlanSuggestion {
  const laterTerm = earliestLaterTerm(
    requirement,
    terms,
    currentTermIndex,
    courseCode,
    completed,
  );
  if (laterTerm) {
    return {
      changeCount: 1,
      message: `Move ${courseCode} to ${laterTerm}, after its prerequisite path is complete.`,
    };
  }

  const options = minimalMissingRequirementOptions(requirement, completed);
  if (options.length === 0) {
    return {
      changeCount: null,
      message: "No modeled course change can satisfy this rule; review the catalog requirement.",
    };
  }
  if (options[0]?.length === 0) {
    return {
      changeCount: 0,
      message: "Revalidate the catalog rule; the modeled prerequisite is already satisfied.",
    };
  }

  const actions = options.map((option) =>
    actionForOption(option, terms, currentTermIndex),
  );
  return {
    changeCount: options[0]?.length ?? null,
    message:
      actions.length === 1
        ? `${actions[0]}.`
        : `Choose one minimum-change path: ${actions.join("; or ")}.`,
  };
}
