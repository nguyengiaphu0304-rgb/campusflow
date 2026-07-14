import type { Course } from "./course";
import { referencedCourses } from "./course";

export interface CourseGraph {
  courses: Map<string, Course>;
  prerequisites: Map<string, Set<string>>;
  dependents: Map<string, Set<string>>;
}

export function buildCourseGraph(catalog: readonly Course[]): CourseGraph {
  const courses = new Map(catalog.map((item) => [item.code, item]));
  const prerequisites = new Map<string, Set<string>>();
  const dependents = new Map<string, Set<string>>();

  for (const item of catalog) {
    prerequisites.set(item.code, new Set());
    dependents.set(item.code, new Set());
  }

  for (const item of catalog) {
    for (const prerequisite of referencedCourses(item.prerequisites)) {
      if (!courses.has(prerequisite)) continue;
      prerequisites.get(item.code)?.add(prerequisite);
      dependents.get(prerequisite)?.add(item.code);
    }
  }

  return { courses, prerequisites, dependents };
}

export function findCycles(graph: CourseGraph): string[][] {
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];
  const cycles: string[][] = [];

  function visit(code: string): void {
    if (visiting.has(code)) {
      const cycleStart = stack.indexOf(code);
      cycles.push([...stack.slice(cycleStart), code]);
      return;
    }
    if (visited.has(code)) return;

    visiting.add(code);
    stack.push(code);
    for (const prerequisite of graph.prerequisites.get(code) ?? []) {
      visit(prerequisite);
    }
    stack.pop();
    visiting.delete(code);
    visited.add(code);
  }

  for (const code of graph.courses.keys()) visit(code);
  return cycles;
}

export function prerequisiteClosure(
  graph: CourseGraph,
  selectedCourses: ReadonlySet<string>,
): Set<string> {
  const closure = new Set(selectedCourses);
  const pending = [...selectedCourses];

  while (pending.length > 0) {
    const current = pending.pop();
    if (!current) continue;
    for (const prerequisite of graph.prerequisites.get(current) ?? []) {
      if (closure.has(prerequisite)) continue;
      closure.add(prerequisite);
      pending.push(prerequisite);
    }
  }

  return closure;
}

export function graphLevels(
  graph: CourseGraph,
  included: ReadonlySet<string>,
): Map<string, number> {
  const memo = new Map<string, number>();
  const visiting = new Set<string>();

  function levelFor(code: string): number {
    const existing = memo.get(code);
    if (existing !== undefined) return existing;
    if (visiting.has(code)) return 0;

    visiting.add(code);
    const prerequisites = [...(graph.prerequisites.get(code) ?? [])].filter(
      (item) => included.has(item),
    );
    const level =
      prerequisites.length === 0
        ? 0
        : Math.max(...prerequisites.map(levelFor)) + 1;
    visiting.delete(code);
    memo.set(code, level);
    return level;
  }

  for (const code of included) levelFor(code);
  return memo;
}
