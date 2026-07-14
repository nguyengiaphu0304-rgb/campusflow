import { describe, expect, it } from "vitest";
import { any, course, type Course } from "./course";
import type { AcademicTerm } from "./plan";
import { moveTerm, totalCredits, validatePlan } from "./plan";

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
    const issues = validatePlan(catalog, terms);
    expect(issues).toEqual([
      expect.objectContaining({ type: "missing-prerequisite", courseCode: "B" }),
    ]);
    expect(issues[0]?.suggestion).toEqual({
      changeCount: 1,
      message: "move A before One.",
    });
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
    expect(validatePlan(catalog, terms).map((issue) => issue.suggestion.message)).toEqual([
      "Remove NOPE, or load a catalog snapshot that contains it.",
      "Remove this later copy of A from Two.",
    ]);
  });

  it("explains that catalog cycles require catalog repair", () => {
    const cyclicCatalog: Course[] = [
      { ...catalog[0]!, prerequisites: course("B") },
      catalog[1]!,
    ];
    const cycle = validatePlan(cyclicCatalog, []).find(
      (issue) => issue.type === "catalog-cycle",
    );

    expect(cycle?.suggestion).toEqual({
      changeCount: null,
      message: "Review the catalog rules; plan edits cannot resolve a catalog cycle.",
    });
  });

  it("counts each scheduled course once", () => {
    const terms: AcademicTerm[] = [
      { id: "one", label: "One", courses: ["A", "C"] },
      { id: "two", label: "Two", courses: ["A"] },
    ];
    expect(totalCredits(catalog, terms)).toBe(1.5);
  });

  it("moves a term forward without mutating the input", () => {
    const terms: AcademicTerm[] = [
      { id: "one", label: "One", courses: ["A"] },
      { id: "two", label: "Two", courses: ["B"] },
      { id: "three", label: "Three", courses: ["C"] },
    ];
    const result = moveTerm(terms, "one", 2);

    expect(result.map(({ id }) => id)).toEqual(["two", "three", "one"]);
    expect(terms.map(({ id }) => id)).toEqual(["one", "two", "three"]);
    expect(result[2]).toBe(terms[0]);
  });

  it("moves a term backward while preserving its courses", () => {
    const terms: AcademicTerm[] = [
      { id: "one", label: "One", courses: ["A"] },
      { id: "two", label: "Two", courses: ["B"] },
      { id: "three", label: "Three", courses: ["C"] },
    ];
    const result = moveTerm(terms, "three", 0);

    expect(result.map(({ id }) => id)).toEqual(["three", "one", "two"]);
    expect(result[0]?.courses).toEqual(["C"]);
  });

  it("returns the original reference for invalid and identity moves", () => {
    const terms: AcademicTerm[] = [{ id: "one", label: "One", courses: [] }];

    expect(moveTerm(terms, "missing", 0)).toBe(terms);
    expect(moveTerm(terms, "one", -1)).toBe(terms);
    expect(moveTerm(terms, "one", 1)).toBe(terms);
    expect(moveTerm(terms, "one", 0.5)).toBe(terms);
    expect(moveTerm(terms, "one", 0)).toBe(terms);
  });
});
