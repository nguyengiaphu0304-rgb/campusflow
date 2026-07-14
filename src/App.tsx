import { useEffect, useMemo, useState } from "react";
import { CourseCatalog } from "./components/CourseCatalog";
import { CatalogProvenance } from "./components/CatalogProvenance";
import { DegreeProgress } from "./components/DegreeProgress";
import { PlanBoard } from "./components/PlanBoard";
import { PlanTransfer } from "./components/PlanTransfer";
import { PrerequisiteGraph } from "./components/PrerequisiteGraph";
import { demoCatalogSnapshot, demoCourses, demoTerms } from "./data/demoCourses";
import { demoProgram } from "./data/demoProgram";
import type { AcademicTerm } from "./domain/plan";
import { moveTerm, totalCredits, validatePlan } from "./domain/plan";

const STORAGE_KEY = "campusflow.plan.v1";

function isSavedPlan(value: unknown): value is AcademicTerm[] {
  return (
    Array.isArray(value) &&
    value.every(
      (term) =>
        typeof term === "object" &&
        term !== null &&
        "id" in term &&
        typeof term.id === "string" &&
        "label" in term &&
        typeof term.label === "string" &&
        "courses" in term &&
        Array.isArray(term.courses) &&
        term.courses.every((code: unknown) => typeof code === "string"),
    )
  );
}

function loadPlan(): AcademicTerm[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return structuredClone(demoTerms);
    const parsed: unknown = JSON.parse(saved);
    return isSavedPlan(parsed) ? parsed : structuredClone(demoTerms);
  } catch {
    return structuredClone(demoTerms);
  }
}

export default function App() {
  const [terms, setTerms] = useState<AcademicTerm[]>(loadPlan);
  const scheduled = useMemo(
    () => new Set(terms.flatMap((term) => term.courses)),
    [terms],
  );
  const issues = useMemo(() => validatePlan(demoCourses, terms), [terms]);
  const credits = useMemo(() => totalCredits(demoCourses, terms), [terms]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(terms));
  }, [terms]);

  function addCourse(termId: string, courseCode: string): void {
    if (scheduled.has(courseCode)) return;
    setTerms((current) =>
      current.map((term) =>
        term.id === termId
          ? { ...term, courses: [...term.courses, courseCode] }
          : term,
      ),
    );
  }

  function removeCourse(termId: string, courseCode: string): void {
    setTerms((current) =>
      current.map((term) =>
        term.id === termId
          ? { ...term, courses: term.courses.filter((code) => code !== courseCode) }
          : term,
      ),
    );
  }

  function reorderTerm(termId: string, destinationIndex: number): void {
    setTerms((current) => moveTerm(current, termId, destinationIndex));
  }

  function resetPlan(): void {
    setTerms(structuredClone(demoTerms));
  }

  return (
    <>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="CampusFlow home">
          <span className="brand-mark">CF</span>
          <span>CampusFlow</span>
        </a>
        <span className="privacy-note">Local-first · no account required</span>
      </header>

      <main id="main-content">
        <section className="hero" id="top">
          <div className="hero-copy">
            <p className="eyebrow">Plan beyond the next semester</p>
            <h1>See every course.<br /><em>Understand every path.</em></h1>
            <p className="hero-description">
              Build a multi-term plan, surface prerequisite mistakes instantly,
              and trace the graph behind every decision. Your draft stays in
              this browser.
            </p>
            <div className="hero-actions">
              <a className="primary-button" href="#planner">Open planner</a>
              <button className="text-button" type="button" onClick={resetPlan}>
                Reset demo
              </button>
            </div>
            <PlanTransfer
              catalog={demoCourses}
              terms={terms}
              onImport={setTerms}
            />
          </div>
          <div className="hero-stats" aria-label="Plan summary">
            <div><strong>{scheduled.size}</strong><span>courses mapped</span></div>
            <div><strong>{credits.toFixed(1)}</strong><span>credits planned</span></div>
            <div><strong>{issues.length}</strong><span>issues detected</span></div>
          </div>
        </section>

        <CatalogProvenance snapshot={demoCatalogSnapshot} />

        <section className="workspace" id="planner" aria-label="Course planning workspace">
          <CourseCatalog
            catalog={demoCourses}
            terms={terms}
            scheduled={scheduled}
            onAdd={addCourse}
          />
          <PlanBoard
            catalog={demoCourses}
            terms={terms}
            issues={issues}
            onMoveTerm={reorderTerm}
            onRemove={removeCourse}
          />
        </section>

        <DegreeProgress catalog={demoCourses} terms={terms} program={demoProgram} />

        <PrerequisiteGraph catalog={demoCourses} selected={scheduled} />
      </main>

      <footer>
        <span>CampusFlow · decision support, not academic advice</span>
        <a href="https://github.com/nguyengiaphu0304-rgb/campusflow">View source</a>
      </footer>
    </>
  );
}
