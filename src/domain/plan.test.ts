import { describe, expect, it } from "vitest";
import { any, course, type Course } from "./course";
import type { AcademicTerm } from "./plan";
import { totalCredits, validatePlan } from "./plan";

const catalog: Course[] = [
  { code: "A", title: "A", description: "", credits: 0.5, breadth: "" },
  { code: "B", title: "B", description: "", credits: 0.5, breadth: "", prerequisites: course("A") },
  { code: "C", title: "C", description: "", credits: 1, breadth: "", prerequisites: any(course("A"), course("B")) },
];

describe("plan validation", () => {
  it("accepts prerequisites completed in an earlier term", () => {
    const terms: AcademicTerm[] = [
      { id: "one", label: "One", courses: ["A"] },
      { id: "two", label: "Two", courses: ["B", "C"] },
    ];
    expect(validatePlan(catalog, terms)).toEqual([]);
  });

  it("rejects a prerequisite taken in the same term", () => {
    const terms: AcademicTerm[] = [{ id: "one", label: "One", courses: ["A", "B"] }];
    expect(validatePlan(catalog, terms)).toEqual([
      expect.objectContaining({ type: "missing-prerequisite", courseCode: "B" }),
    ]);
  });

  it("reports duplicate and unknown courses", () => {
    const terms: AcademicTerm[] = [
      { id: "one", label: "One", courses: ["A", "NOPE"] },
      { id: "two", label: "Two", courses: ["A"] },
    ];
    expect(validatePlan(catalog, terms).map((issue) => issue.type)).toEqual([
      "unknown-course",
      "duplicate-course",
    ]);
  });

  it("counts each scheduled course once", () => {
    const terms: AcademicTerm[] = [
      { id: "one", label: "One", courses: ["A", "C"] },
      { id: "two", label: "Two", courses: ["A"] },
    ];
    expect(totalCredits(catalog, terms)).toBe(1.5);
  });
});
