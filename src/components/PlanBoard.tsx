import type { Course } from "../domain/course";
import type { AcademicTerm, PlanIssue } from "../domain/plan";

interface PlanBoardProps {
  catalog: readonly Course[];
  terms: readonly AcademicTerm[];
  issues: readonly PlanIssue[];
  onRemove: (termId: string, courseCode: string) => void;
}

export function PlanBoard({
  catalog,
  terms,
  issues,
  onRemove,
}: PlanBoardProps) {
  const catalogByCode = new Map(catalog.map((item) => [item.code, item]));

  return (
    <section className="panel plan-panel" aria-labelledby="plan-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Sequence</p>
          <h2 id="plan-title">Academic plan</h2>
        </div>
        <span className={issues.length === 0 ? "status-good" : "status-warning"}>
          {issues.length === 0 ? "Plan valid" : `${issues.length} issue${issues.length === 1 ? "" : "s"}`}
        </span>
      </div>

      <div className="term-grid">
        {terms.map((term, index) => (
          <article className="term-card" key={term.id}>
            <div className="term-header">
              <span className="term-index">{String(index + 1).padStart(2, "0")}</span>
              <h3>{term.label}</h3>
            </div>
            {term.courses.length === 0 ? (
              <p className="empty-state">No courses yet.</p>
            ) : (
              <ul className="planned-courses">
                {term.courses.map((code) => (
                  <li key={code}>
                    <div>
                      <strong>{code}</strong>
                      <span>{catalogByCode.get(code)?.title ?? "Unknown course"}</span>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${code} from ${term.label}`}
                      onClick={() => onRemove(term.id, code)}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </div>

      {issues.length > 0 && (
        <div className="issue-list" role="status" aria-label="Plan issues">
          <strong>Review before committing to this plan</strong>
          <ul>
            {issues.map((issue, index) => (
              <li key={`${issue.type}-${issue.courseCode ?? "catalog"}-${index}`}>
                {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
