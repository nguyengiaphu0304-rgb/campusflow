import type { Course } from "./course";

export type CourseSelector =
  | { type: "codes"; codes: readonly string[] }
  | { type: "breadths"; breadths: readonly string[] };

export type DegreeRule =
  | { type: "course"; code: string }
  | { type: "credits"; minimum: number; selector: CourseSelector }
  | { type: "all"; rules: readonly DegreeRule[] }
  | { type: "any"; rules: readonly DegreeRule[] };

export interface DegreeGroup {
  id: string;
  label: string;
  description: string;
  rule: DegreeRule;
}

export interface DegreeProgram {
  id: string;
  name: string;
  disclaimer: string;
  groups: readonly DegreeGroup[];
}

export interface RuleProgress {
  complete: boolean;
  fraction: number;
  summary: string;
  missing: string[];
  earnedCredits?: number;
  requiredCredits?: number;
}

export interface ProgramProgress {
  completedGroups: number;
  totalGroups: number;
  fraction: number;
  groups: Array<DegreeGroup & { progress: RuleProgress }>;
}

function formatCredits(value: number): string {
  return value.toFixed(1);
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function selectedCourses(catalog: readonly Course[], selector: CourseSelector): Course[] {
  if (selector.type === "codes") {
    const allowed = new Set(selector.codes);
    return catalog.filter(({ code }) => allowed.has(code));
  }
  const allowed = new Set(selector.breadths);
  return catalog.filter(({ breadth }) => allowed.has(breadth));
}

export function evaluateDegreeRule(
  rule: DegreeRule,
  catalog: readonly Course[],
  plannedCodes: ReadonlySet<string>,
): RuleProgress {
  if (rule.type === "course") {
    const complete = plannedCodes.has(rule.code);
    return {
      complete,
      fraction: complete ? 1 : 0,
      summary: complete ? `${rule.code} is planned.` : `${rule.code} is not planned.`,
      missing: complete ? [] : [`Plan ${rule.code}.`],
    };
  }

  if (rule.type === "credits") {
    const earned = selectedCourses(catalog, rule.selector).reduce(
      (total, course) => total + (plannedCodes.has(course.code) ? course.credits : 0),
      0,
    );
    const required = Math.max(0, rule.minimum);
    const complete = earned >= required;
    const remaining = Math.max(0, required - earned);
    return {
      complete,
      fraction: required === 0 ? 1 : Math.min(1, earned / required),
      summary: `${formatCredits(earned)} of ${formatCredits(required)} credits planned.`,
      missing: complete ? [] : [`Plan ${formatCredits(remaining)} more eligible credits.`],
      earnedCredits: earned,
      requiredCredits: required,
    };
  }

  const children = rule.rules.map((child) =>
    evaluateDegreeRule(child, catalog, plannedCodes),
  );
  if (rule.type === "all") {
    const complete = children.every((child) => child.complete);
    const fraction = children.length === 0
      ? 1
      : children.reduce((total, child) => total + child.fraction, 0) / children.length;
    return {
      complete,
      fraction,
      summary: complete ? "Every condition is satisfied." : "Some conditions remain.",
      missing: unique(children.flatMap((child) => child.missing)),
    };
  }

  if (children.length === 0) {
    return {
      complete: false,
      fraction: 0,
      summary: "No alternatives are configured.",
      missing: ["No alternatives are configured."],
    };
  }

  const best = children
    .map((progress, index) => ({ progress, index }))
    .sort((left, right) =>
      right.progress.fraction - left.progress.fraction ||
      left.progress.missing.length - right.progress.missing.length ||
      left.index - right.index,
    )[0]!.progress;
  return {
    ...best,
    summary: best.complete
      ? "One permitted path is satisfied."
      : `Closest permitted path: ${best.summary}`,
  };
}

export function evaluateDegreeProgram(
  program: DegreeProgram,
  catalog: readonly Course[],
  plannedCourseCodes: readonly string[],
): ProgramProgress {
  const plannedCodes = new Set(plannedCourseCodes);
  const groups = program.groups.map((group) => ({
    ...group,
    progress: evaluateDegreeRule(group.rule, catalog, plannedCodes),
  }));
  const completedGroups = groups.filter(({ progress }) => progress.complete).length;
  const totalGroups = groups.length;
  return {
    completedGroups,
    totalGroups,
    fraction: totalGroups === 0 ? 1 : completedGroups / totalGroups,
    groups,
  };
}
