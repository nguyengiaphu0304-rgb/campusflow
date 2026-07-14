import { describe, expect, it } from "vitest";
import {
  MAX_PLAN_FILE_BYTES,
  parsePlan,
  planExportFilename,
  serializePlan,
} from "./portablePlan";
import type { AcademicTerm } from "./plan";

const knownCourses = new Set(["CSC108H1", "CSC148H1"]);
const terms: AcademicTerm[] = [
  { id: "fall-2026", label: "Fall 2026", courses: ["CSC108H1"] },
  { id: "winter-2027", label: "Winter 2027", courses: ["CSC148H1"] },
];

describe("portable plan files", () => {
  it("round-trips a versioned plan without sharing mutable references", () => {
    const result = parsePlan(
      serializePlan(terms, new Date("2026-07-14T00:00:00.000Z")),
      knownCourses,
    );

    expect(result).toEqual({ ok: true, terms });
    if (result.ok) {
      result.terms[0]?.courses.push("CSC148H1");
      expect(terms[0]?.courses).toEqual(["CSC108H1"]);
    }
  });

  it("produces deterministic JSON and filenames when given a timestamp", () => {
    const date = new Date("2026-07-14T05:04:03.000Z");
    const exported = serializePlan(terms, date);

    expect(exported).toContain('"schema": "campusflow-plan"');
    expect(exported).toContain('"version": 1');
    expect(exported.endsWith("\n")).toBe(true);
    expect(planExportFilename(date)).toBe("campusflow-plan-2026-07-14.json");
  });

  it.each([
    ["malformed JSON", "{", "not valid JSON"],
    ["wrong schema", '{"schema":"other"}', "not a CampusFlow"],
    [
      "unsupported version",
      '{"schema":"campusflow-plan","version":2}',
      "version 2 is not supported",
    ],
  ])("rejects %s", (_case, source, message) => {
    expect(parsePlan(source, knownCourses)).toEqual({
      ok: false,
      error: expect.stringContaining(message),
    });
  });

  it("rejects duplicate term ids", () => {
    const duplicateIds = {
      ...JSON.parse(serializePlan(terms)),
      plan: { terms: [terms[0], { ...terms[1], id: terms[0]?.id }] },
    };

    expect(parsePlan(JSON.stringify(duplicateIds), knownCourses)).toEqual({
      ok: false,
      error: expect.stringContaining("appears more than once"),
    });
  });

  it("rejects unknown and duplicate course codes", () => {
    const unknown: AcademicTerm[] = [
      { id: "fall-2026", label: "Fall 2026", courses: ["CSC999H1"] },
    ];
    const duplicate: AcademicTerm[] = [
      terms[0]!,
      { ...terms[1]!, courses: ["CSC108H1"] },
    ];

    expect(parsePlan(serializePlan(unknown), knownCourses)).toEqual({
      ok: false,
      error: expect.stringContaining("not available"),
    });
    expect(parsePlan(serializePlan(duplicate), knownCourses)).toEqual({
      ok: false,
      error: expect.stringContaining("appears more than once"),
    });
  });

  it("rejects excessive terms and oversized input", () => {
    const excessiveTerms = Array.from({ length: 25 }, (_, index) => ({
      id: `term-${index}`,
      label: `Term ${index}`,
      courses: [],
    }));

    expect(parsePlan(serializePlan(excessiveTerms), knownCourses)).toEqual({
      ok: false,
      error: expect.stringContaining("between 1 and 24"),
    });
    expect(
      parsePlan(" ".repeat(MAX_PLAN_FILE_BYTES + 1), knownCourses),
    ).toEqual({
      ok: false,
      error: expect.stringContaining("larger than 256 KiB"),
    });
  });

  it("rejects invalid timestamps, labels, and course-code shapes", () => {
    const base = JSON.parse(serializePlan(terms));

    expect(
      parsePlan(JSON.stringify({ ...base, exportedAt: "not-a-date" }), knownCourses),
    ).toEqual({ ok: false, error: expect.stringContaining("timestamp") });
    expect(
      parsePlan(
        JSON.stringify({
          ...base,
          plan: { terms: [{ id: "one", label: " ", courses: [] }] },
        }),
        knownCourses,
      ),
    ).toEqual({ ok: false, error: expect.stringContaining("invalid label") });
    expect(
      parsePlan(
        JSON.stringify({
          ...base,
          plan: { terms: [{ id: "one", label: "One", courses: ["<script>"] }] },
        }),
        knownCourses,
      ),
    ).toEqual({ ok: false, error: expect.stringContaining("course code") });
  });
});
