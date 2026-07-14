import { useMemo } from "react";
import type { Course } from "../domain/course";
import type { DegreeProgram } from "../domain/degree";
import { evaluateDegreeProgram } from "../domain/degree";
import type { AcademicTerm } from "../domain/plan";

interface DegreeProgressProps {
  catalog: readonly Course[];
  terms: readonly AcademicTerm[];
  program: DegreeProgram;
}

export function DegreeProgress({ catalog, terms, program }: DegreeProgressProps) {
  const progress = useMemo(
    () => evaluateDegreeProgram(program, catalog, terms.flatMap((term) => term.courses)),
    [catalog, program, terms],
  );

  return (
    <section className="degree-panel panel" aria-labelledby="degree-progress-title">
      <div className="section-heading degree-heading">
        <div>
          <p className="eyebrow">Requirement explorer</p>
          <h2 id="degree-progress-title">Degree progress</h2>
        </div>
        <span className="count-pill">
          {progress.completedGroups} of {progress.totalGroups} groups complete
        </span>
      </div>
      <p className="degree-intro">{program.name}</p>
      <p className="degree-disclaimer" role="note">{program.disclaimer}</p>
      <div className="degree-grid">
        {progress.groups.map((group) => {
          const percent = Math.round(group.progress.fraction * 100);
          return (
            <article className="degree-card" key={group.id}>
              <div className="degree-card-heading">
                <h3>{group.label}</h3>
                <span className={group.progress.complete ? "status-good" : "status-warning"}>
                  {group.progress.complete ? "Complete" : "In progress"}
                </span>
              </div>
              <p>{group.description}</p>
              <progress aria-label={`${group.label}: ${percent}% complete`} max={100} value={percent}>
                {percent}%
              </progress>
              <p className="degree-summary">{group.progress.summary}</p>
              {group.progress.missing.length > 0 && (
                <ul className="degree-missing" aria-label={`Remaining work for ${group.label}`}>
                  {group.progress.missing.map((item) => <li key={item}>{item}</li>)}
                </ul>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
