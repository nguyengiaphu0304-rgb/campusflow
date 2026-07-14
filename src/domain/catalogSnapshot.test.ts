import { describe, expect, it } from "vitest";
import rawCatalogSnapshot from "../data/catalog.v1.json";
import {
  MAX_CATALOG_FILE_BYTES,
  parseCatalogSnapshot,
  parseCatalogSnapshotJson,
} from "./catalogSnapshot";

type MutableRecord = Record<string, unknown>;

function documentCopy(): MutableRecord {
  return JSON.parse(JSON.stringify(rawCatalogSnapshot)) as MutableRecord;
}

function coursesIn(document: MutableRecord): MutableRecord[] {
  return document.courses as MutableRecord[];
}

function issueCodes(document: unknown): string[] {
  const result = parseCatalogSnapshot(document);
  return result.ok ? [] : result.issues.map(({ code }) => code);
}

describe("catalog snapshot parsing", () => {
  it("loads the bundled versioned snapshot and provenance", () => {
    const result = parseCatalogSnapshot(rawCatalogSnapshot);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot.schema).toBe("campusflow-catalog");
    expect(result.snapshot.version).toBe(1);
    expect(result.snapshot.snapshotId).toBe("illustrative-2026-07-14");
    expect(result.snapshot.source.url).toMatch(/^https:\/\//);
    expect(result.snapshot.courses).toHaveLength(11);
  });

  it("fails closed for unknown schemas and versions", () => {
    const document = documentCopy();
    document.schema = "other-catalog";
    document.version = 2;

    expect(issueCodes(document)).toEqual(
      expect.arrayContaining(["unsupported-schema", "unsupported-version"]),
    );
  });

  it("rejects malformed and oversized JSON documents", () => {
    const malformed = parseCatalogSnapshotJson("{");
    expect(malformed.ok).toBe(false);
    if (!malformed.ok) expect(malformed.issues[0]?.message).toBe("Catalog file is not valid JSON.");

    const oversized = parseCatalogSnapshotJson("x".repeat(MAX_CATALOG_FILE_BYTES + 1));
    expect(oversized.ok).toBe(false);
    if (!oversized.ok) expect(oversized.issues[0]?.message).toBe("Catalog files are limited to 1 MiB.");
  });

  it("rejects unsafe provenance and unexpected fields", () => {
    const document = documentCopy();
    const source = document.source as MutableRecord;
    source.url = "http://example.com/catalog";
    source.retrievedAt = "yesterday";
    source.untrusted = true;

    const result = parseCatalogSnapshot(document);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.map(({ path }) => path)).toEqual(
      expect.arrayContaining([
        "$.source.url",
        "$.source.retrievedAt",
        "$.source.untrusted",
      ]),
    );
  });

  it("rejects duplicate codes and dangling references", () => {
    const document = documentCopy();
    const courses = coursesIn(document);
    courses[1]!.code = courses[0]!.code;
    courses[4]!.prerequisites = { type: "course", code: "CSC999H1" };

    expect(issueCodes(document)).toEqual(
      expect.arrayContaining(["duplicate-course", "dangling-reference"]),
    );
  });

  it("rejects self-references and multi-course cycles", () => {
    const selfDocument = documentCopy();
    coursesIn(selfDocument)[0]!.prerequisites = {
      type: "course",
      code: "CSC110Y1",
    };
    expect(issueCodes(selfDocument)).toContain("self-reference");

    const cycleDocument = documentCopy();
    const courses = coursesIn(cycleDocument);
    courses[0]!.prerequisites = { type: "course", code: "CSC111H1" };
    expect(issueCodes(cycleDocument)).toContain("catalog-cycle");
  });

  it("rejects empty groups and duplicate direct branches", () => {
    const emptyDocument = documentCopy();
    coursesIn(emptyDocument)[4]!.prerequisites = { type: "any", requirements: [] };
    expect(issueCodes(emptyDocument)).toContain("invalid-field");

    const duplicateDocument = documentCopy();
    coursesIn(duplicateDocument)[4]!.prerequisites = {
      type: "any",
      requirements: [
        { type: "course", code: "CSC111H1" },
        { type: "course", code: "CSC111H1" },
      ],
    };
    expect(issueCodes(duplicateDocument)).toContain("duplicate-branch");
  });

  it("bounds recursive requirement trees", () => {
    const document = documentCopy();
    let requirement: unknown = { type: "course", code: "CSC111H1" };
    for (let index = 0; index < 9; index += 1) {
      requirement = { type: "all", requirements: [requirement] };
    }
    coursesIn(document)[4]!.prerequisites = requirement;

    const result = parseCatalogSnapshot(document);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some(({ message }) => message.includes("limited to depth"))).toBe(true);
  });

  it("validates course codes, credit increments, and strict strings", () => {
    const document = documentCopy();
    const course = coursesIn(document)[0]!;
    course.code = "csc110";
    course.credits = 0.75;
    course.title = " Padded title";

    const result = parseCatalogSnapshot(document);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.map(({ path }) => path)).toEqual(
      expect.arrayContaining([
        "$.courses[0].code",
        "$.courses[0].credits",
        "$.courses[0].title",
      ]),
    );
  });
});
