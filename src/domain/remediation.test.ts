import { describe, expect, it } from "vitest";
import { all, any, course } from "./course";
import {
  minimalMissingRequirementOptions,
  suggestPrerequisiteFix,
} from "./remediation";

describe("minimal prerequisite options", () => {
  it("returns no changes for a completed requirement", () => {
    expect(
      minimalMissingRequirementOptions(course("A"), new Set(["A"])),
    ).toEqual([[]]);
  });

  it("keeps equal-cost alternatives in deterministic order", () => {
    expect(
      minimalMissingRequirementOptions(
        any(course("B"), course("A")),
        new Set(),
      ),
    ).toEqual([["A"], ["B"]]);
  });

  it("combines every branch of an all requirement", () => {
    expect(
      minimalMissingRequirementOptions(
        all(course("A"), any(course("B"), course("C"))),
        new Set(),
      ),
    ).toEqual([
      ["A", "B"],
      ["A", "C"],
    ]);
  });

  it("does not prune a larger intermediate option that overlaps later work", () => {
    const requirement = all(
      any(course("A"), all(course("B"), course("C"))),
      course("B"),
      course("C"),
    );

    expect(minimalMissingRequirementOptions(requirement, new Set())).toEqual([
      ["B", "C"],
    ]);
  });

  it("collapses repeated references to the same course", () => {
    expect(
      minimalMissingRequirementOptions(
        all(course("A"), any(course("A"), course("B"))),
        new Set(),
      ),
    ).toEqual([["A"]]);
  });
});

describe("prerequisite remediation", () => {
  it("prefers one move to the earliest later valid term", () => {
    const suggestion = suggestPrerequisiteFix(
      course("A"),
      [
        { label: "Fall", courses: ["A", "B"] },
        { label: "Winter", courses: [] },
      ],
      0,
      "B",
      new Set(),
    );

    expect(suggestion).toEqual({
      changeCount: 1,
      message: "Move B to Winter, after its prerequisite path is complete.",
    });
  });

  it("waits until a future prerequisite is complete", () => {
    const suggestion = suggestPrerequisiteFix(
      course("A"),
      [
        { label: "Fall", courses: ["B"] },
        { label: "Winter", courses: ["A"] },
        { label: "Next Fall", courses: [] },
      ],
      0,
      "B",
      new Set(),
    );

    expect(suggestion.message).toBe(
      "Move B to Next Fall, after its prerequisite path is complete.",
    );
  });

  it("distinguishes moving a scheduled course from adding one", () => {
    const suggestion = suggestPrerequisiteFix(
      all(course("A"), course("C")),
      [{ label: "Fall", courses: ["A", "B"] }],
      0,
      "B",
      new Set(),
    );

    expect(suggestion).toEqual({
      changeCount: 2,
      message: "move A before Fall and add C before Fall.",
    });
  });

  it("reports when an empty alternative cannot be repaired by course edits", () => {
    const suggestion = suggestPrerequisiteFix(
      any(),
      [{ label: "Fall", courses: ["B"] }],
      0,
      "B",
      new Set(),
    );

    expect(suggestion.changeCount).toBeNull();
    expect(suggestion.message).toContain("No modeled course change");
  });
});
