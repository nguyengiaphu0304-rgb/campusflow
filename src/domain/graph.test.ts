import { describe, expect, it } from "vitest";
import { course, type Course } from "./course";
import {
  buildCourseGraph,
  findCycles,
  graphLevels,
  prerequisiteClosure,
} from "./graph";

const catalog: Course[] = [
  { code: "A", title: "A", description: "", credits: 0.5, breadth: "" },
  { code: "B", title: "B", description: "", credits: 0.5, breadth: "", prerequisites: course("A") },
  { code: "C", title: "C", description: "", credits: 0.5, breadth: "", prerequisites: course("B") },
];

describe("course graph", () => {
  it("builds prerequisite and dependent indexes", () => {
    const graph = buildCourseGraph(catalog);
    expect([...graph.prerequisites.get("C") ?? []]).toEqual(["B"]);
    expect([...graph.dependents.get("A") ?? []]).toEqual(["B"]);
  });

  it("returns the transitive prerequisite closure", () => {
    const graph = buildCourseGraph(catalog);
    expect([...prerequisiteClosure(graph, new Set(["C"]))].sort()).toEqual(["A", "B", "C"]);
  });

  it("assigns increasing levels along a prerequisite path", () => {
    const graph = buildCourseGraph(catalog);
    expect(Object.fromEntries(graphLevels(graph, new Set(["A", "B", "C"])))).toEqual({ A: 0, B: 1, C: 2 });
  });

  it("detects a catalog cycle", () => {
    const cyclic: Course[] = [
      { ...catalog[0]!, prerequisites: course("C") },
      catalog[1]!,
      catalog[2]!,
    ];
    expect(findCycles(buildCourseGraph(cyclic))).toEqual([["A", "C", "B", "A"]]);
  });
});
