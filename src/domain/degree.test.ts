import { describe, expect, it } from "vitest";
import { demoCourses } from "../data/demoCourses";
import { evaluateDegreeProgram, evaluateDegreeRule, type DegreeProgram } from "./degree";

describe("degree requirement evaluation", () => {
  it("reports required courses as complete or missing", () => {
    expect(evaluateDegreeRule(
      { type: "course", code: "CSC148H1" }, demoCourses, new Set(["CSC148H1"]),
    ).complete).toBe(true);
    expect(evaluateDegreeRule(
      { type: "course", code: "CSC148H1" }, demoCourses, new Set(),
    ).missing).toEqual(["Plan CSC148H1."]);
  });

  it("counts each known eligible course once and ignores unknown codes", () => {
    const program: DegreeProgram = {
      id: "test",
      name: "Test",
      disclaimer: "Fixture",
      groups: [{
        id: "credits",
        label: "Credits",
        description: "",
        rule: {
          type: "credits",
          minimum: 1.5,
          selector: { type: "codes", codes: ["CSC110Y1", "CSC148H1"] },
        },
      }],
    };
    const result = evaluateDegreeProgram(program, demoCourses, [
      "CSC110Y1", "CSC110Y1", "CSC148H1", "UNKNOWN",
    ]);
    expect(result.completedGroups).toBe(1);
    expect(result.groups[0]?.progress.earnedCredits).toBe(1.5);
  });

  it("selects credits by breadth category", () => {
    const result = evaluateDegreeRule({
      type: "credits",
      minimum: 1,
      selector: { type: "breadths", breadths: ["Mathematics"] },
    }, demoCourses, new Set(["MAT148H1", "MAT149H1", "STA130H1"]));
    expect(result.complete).toBe(true);
    expect(result.earnedCredits).toBe(1);
  });

  it("combines every condition in an all rule", () => {
    const result = evaluateDegreeRule({
      type: "all",
      rules: [
        { type: "course", code: "CSC110Y1" },
        { type: "course", code: "CSC111H1" },
      ],
    }, demoCourses, new Set(["CSC110Y1"]));
    expect(result.complete).toBe(false);
    expect(result.fraction).toBe(0.5);
    expect(result.missing).toEqual(["Plan CSC111H1."]);
  });

  it("explains the strongest any-rule path", () => {
    const result = evaluateDegreeRule({
      type: "any",
      rules: [
        {
          type: "all",
          rules: [
            { type: "course", code: "CSC110Y1" },
            { type: "course", code: "CSC111H1" },
          ],
        },
        { type: "course", code: "CSC148H1" },
      ],
    }, demoCourses, new Set(["CSC110Y1"]));
    expect(result.fraction).toBe(0.5);
    expect(result.missing).toEqual(["Plan CSC111H1."]);
  });

  it("uses stable source order to break equal any-rule paths", () => {
    const result = evaluateDegreeRule({
      type: "any",
      rules: [
        { type: "course", code: "CSC148H1" },
        { type: "course", code: "MAT148H1" },
      ],
    }, demoCourses, new Set());
    expect(result.missing).toEqual(["Plan CSC148H1."]);
  });

  it("defines safe semantics for empty groups and zero thresholds", () => {
    expect(evaluateDegreeRule({ type: "all", rules: [] }, demoCourses, new Set()).complete).toBe(true);
    expect(evaluateDegreeRule({ type: "any", rules: [] }, demoCourses, new Set()).complete).toBe(false);
    expect(evaluateDegreeRule({
      type: "credits",
      minimum: 0,
      selector: { type: "codes", codes: [] },
    }, demoCourses, new Set()).fraction).toBe(1);
  });
});
