import { describe, expect, it } from "vitest";
import { compareCatalogSnapshots } from "./catalogDiff";
import type { CatalogSnapshot } from "./catalogSnapshot";
import { all, any, course, type Course } from "./course";

function snapshot(snapshotId: string, courses: Course[]): CatalogSnapshot {
  return {
    schema: "campusflow-catalog",
    version: 1,
    snapshotId,
    source: {
      name: "Fixture",
      url: "https://example.com/catalog",
      retrievedAt: "2026-07-14T00:00:00.000Z",
      note: "Test fixture",
    },
    courses,
  };
}

const baseCourses: Course[] = [
  {
    code: "CSC148H1",
    title: "Introduction to Computer Science",
    description: "Data structures.",
    credits: 0.5,
    breadth: "CS",
  },
  {
    code: "CSC207H1",
    title: "Software Design",
    description: "Software architecture.",
    credits: 0.5,
    breadth: "CS",
    prerequisites: course("CSC148H1"),
  },
];

describe("catalog snapshot comparison", () => {
  it("returns no changes for identical content in a different course order", () => {
    const result = compareCatalogSnapshots(
      snapshot("before", baseCourses),
      snapshot("after", [...baseCourses].reverse()),
    );

    expect(result.changes).toEqual([]);
    expect(result.summary).toEqual({
      added: 0,
      removed: 0,
      modified: 0,
      planningImpact: 0,
      metadataOnly: 0,
    });
  });

  it("reports added and removed codes in stable lexical order", () => {
    const previous = snapshot("before", [baseCourses[1]!]);
    const current = snapshot("after", [
      { ...baseCourses[0]!, code: "STA130H1" },
      { ...baseCourses[0]!, code: "MAT223H1" },
    ]);

    const result = compareCatalogSnapshots(previous, current);
    expect(result.changes.map(({ type, code }) => `${type}:${code}`)).toEqual([
      "removed:CSC207H1",
      "added:MAT223H1",
      "added:STA130H1",
    ]);
    expect(result.summary.planningImpact).toBe(3);
  });

  it("classifies copy-only changes as metadata", () => {
    const current = baseCourses.map((item) =>
      item.code === "CSC148H1"
        ? { ...item, title: "Computer Science I", description: "Updated copy." }
        : item,
    );
    const result = compareCatalogSnapshots(
      snapshot("before", baseCourses),
      snapshot("after", current),
    );

    expect(result.changes).toEqual([
      expect.objectContaining({
        type: "modified",
        code: "CSC148H1",
        impact: "metadata",
        fields: [
          { field: "title", previous: "Introduction to Computer Science", current: "Computer Science I" },
          { field: "description", previous: "Data structures.", current: "Updated copy." },
        ],
      }),
    ]);
    expect(result.summary.metadataOnly).toBe(1);
  });

  it("classifies credit and prerequisite changes as planning impact", () => {
    const current = baseCourses.map((item) =>
      item.code === "CSC207H1"
        ? { ...item, credits: 1, prerequisites: all(course("CSC148H1"), course("CSC165H1")) }
        : item,
    );
    const result = compareCatalogSnapshots(
      snapshot("before", baseCourses),
      snapshot("after", current),
    );
    const change = result.changes[0];

    expect(change).toEqual(expect.objectContaining({
      type: "modified",
      impact: "planning",
    }));
    if (change?.type !== "modified") return;
    expect(change.fields.map(({ field }) => field)).toEqual(["credits", "prerequisites"]);
    expect(change.fields[0]).toEqual({
      field: "credits",
      previous: "0.5 credits",
      current: "1.0 credits",
    });
  });

  it("treats reordered Boolean branches as semantically equivalent", () => {
    const previousCourse: Course = {
      ...baseCourses[1]!,
      prerequisites: all(
        course("CSC148H1"),
        any(course("CSC165H1"), course("MAT223H1")),
      ),
    };
    const currentCourse: Course = {
      ...previousCourse,
      prerequisites: all(
        any(course("MAT223H1"), course("CSC165H1")),
        course("CSC148H1"),
      ),
    };

    expect(compareCatalogSnapshots(
      snapshot("before", [previousCourse]),
      snapshot("after", [currentCourse]),
    ).changes).toEqual([]);
  });

  it("does not mutate either snapshot", () => {
    const previous = snapshot("before", structuredClone(baseCourses));
    const current = snapshot("after", structuredClone(baseCourses));
    const beforePrevious = structuredClone(previous);
    const beforeCurrent = structuredClone(current);

    compareCatalogSnapshots(previous, current);

    expect(previous).toEqual(beforePrevious);
    expect(current).toEqual(beforeCurrent);
  });
});
