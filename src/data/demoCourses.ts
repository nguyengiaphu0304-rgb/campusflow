import type { AcademicTerm } from "../domain/plan";
import { parseCatalogSnapshot } from "../domain/catalogSnapshot";
import rawCatalogSnapshot from "./catalog.v1.json";
import rawPreviousCatalogSnapshot from "./catalog.previous.v1.json";

function loadBundledCatalog(value: unknown, label: string) {
  const result = parseCatalogSnapshot(value);
  if (result.ok) return result.snapshot;
  const details = result.issues
    .map((issue) => `${issue.path}: ${issue.message}`)
    .join("; ");
  throw new Error(`Bundled ${label} catalog snapshot is invalid: ${details}`);
}

export const demoCatalogSnapshot = loadBundledCatalog(rawCatalogSnapshot, "current");
export const demoPreviousCatalogSnapshot = loadBundledCatalog(
  rawPreviousCatalogSnapshot,
  "previous",
);
export const demoCourses = demoCatalogSnapshot.courses;

export const demoTerms: AcademicTerm[] = [
  {
    id: "fall-1",
    label: "Year 1 · Fall",
    courses: ["CSC110Y1", "MAT148H1", "STA130H1"],
  },
  {
    id: "winter-1",
    label: "Year 1 · Winter",
    courses: ["CSC111H1", "MAT149H1", "MAT223H1"],
  },
  {
    id: "fall-2",
    label: "Year 2 · Fall",
    courses: ["CSC207H1", "CSC236H1"],
  },
  {
    id: "winter-2",
    label: "Year 2 · Winter",
    courses: ["CSC263H1"],
  },
];
