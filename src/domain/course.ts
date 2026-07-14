export type CourseRequirement =
  | { type: "course"; code: string }
  | { type: "all"; requirements: CourseRequirement[] }
  | { type: "any"; requirements: CourseRequirement[] };

export interface Course {
  code: string;
  title: string;
  description: string;
  credits: number;
  breadth: string;
  prerequisites?: CourseRequirement;
}

export function course(code: string): CourseRequirement {
  return { type: "course", code };
}

export function all(...requirements: CourseRequirement[]): CourseRequirement {
  return { type: "all", requirements };
}

export function any(...requirements: CourseRequirement[]): CourseRequirement {
  return { type: "any", requirements };
}

export function referencedCourses(requirement?: CourseRequirement): string[] {
  if (!requirement) return [];
  if (requirement.type === "course") return [requirement.code];

  return [
    ...new Set(requirement.requirements.flatMap(referencedCourses)),
  ].sort();
}

export function describeRequirement(requirement: CourseRequirement): string {
  if (requirement.type === "course") return requirement.code;

  const separator = requirement.type === "all" ? " and " : " or ";
  return requirement.requirements.map(describeRequirement).join(separator);
}

export function isRequirementSatisfied(
  requirement: CourseRequirement | undefined,
  completed: ReadonlySet<string>,
): boolean {
  if (!requirement) return true;
  if (requirement.type === "course") return completed.has(requirement.code);
  if (requirement.type === "all") {
    return requirement.requirements.every((item) =>
      isRequirementSatisfied(item, completed),
    );
  }
  return requirement.requirements.some((item) =>
    isRequirementSatisfied(item, completed),
  );
}
