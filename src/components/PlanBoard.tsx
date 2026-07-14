import { useRef, useState, type DragEvent } from "react";
import type { Course } from "../domain/course";
import type { AcademicTerm, PlanIssue } from "../domain/plan";

interface PlanBoardProps {
  catalog: readonly Course[];
  terms: readonly AcademicTerm[];
  issues: readonly PlanIssue[];
  onMoveTerm: (termId: string, destinationIndex: number) => void;
  onRemove: (termId: string, courseCode: string) => void;
}

export function PlanBoard({
  catalog,
  terms,
  issues,
  onMoveTerm,
  onRemove,
}: PlanBoardProps) {
  const catalogByCode = new Map(catalog.map((item) => [item.code, item]));
  const [announcement, setAnnouncement] = useState("");
  const draggingTermId = useRef<string | null>(null);
  const moveButtonRefs = useRef(new Map<string, HTMLButtonElement>());

  function announceMove(termId: string, destinationIndex: number): void {
    const sourceIndex = terms.findIndex((term) => term.id === termId);
    if (sourceIndex === -1 || sourceIndex === destinationIndex) return;
    const term = terms[sourceIndex]!;
    onMoveTerm(termId, destinationIndex);
    setAnnouncement(
      `Moved ${term.label} to position ${destinationIndex + 1} of ${terms.length}.`,
    );
  }

  function moveWithKeyboard(
    termId: string,
    destinationIndex: number,
    control: "earlier" | "later",
  ): void {
    announceMove(termId, destinationIndex);
    requestAnimationFrame(() => {
      moveButtonRefs.current.get(`${termId}:${control}`)?.focus();
    });
  }

  function startDrag(event: DragEvent<HTMLElement>, termId: string): void {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", termId);
    draggingTermId.current = termId;
  }

  function dropTerm(event: DragEvent<HTMLElement>, destinationIndex: number): void {
    event.preventDefault();
    const termId = draggingTermId.current ?? event.dataTransfer.getData("text/plain");
    announceMove(termId, destinationIndex);
    draggingTermId.current = null;
    event.currentTarget.classList.remove("drag-target");
  }

  function clearDragTargets(): void {
    document.querySelectorAll(".term-card.drag-target").forEach((element) => {
      element.classList.remove("drag-target");
    });
  }

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
          <article
            className="term-card"
            data-term-id={term.id}
            key={term.id}
            onDragEnter={(event) => {
              if (draggingTermId.current && draggingTermId.current !== term.id) {
                event.currentTarget.classList.add("drag-target");
              }
            }}
            onDragLeave={(event) => event.currentTarget.classList.remove("drag-target")}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
            }}
            onDrop={(event) => dropTerm(event, index)}
          >
            <div className="term-header">
              <div className="term-title">
                <span className="term-index">{String(index + 1).padStart(2, "0")}</span>
                <h3>{term.label}</h3>
              </div>
              <div className="term-order-controls" aria-label={`Reorder ${term.label}`}>
                <button
                  ref={(element) => {
                    if (element) moveButtonRefs.current.set(`${term.id}:earlier`, element);
                  }}
                  type="button"
                  disabled={index === 0}
                  aria-label={`Move ${term.label} earlier`}
                  onClick={() => moveWithKeyboard(term.id, index - 1, "earlier")}
                >
                  Earlier
                </button>
                <button
                  ref={(element) => {
                    if (element) moveButtonRefs.current.set(`${term.id}:later`, element);
                  }}
                  type="button"
                  disabled={index === terms.length - 1}
                  aria-label={`Move ${term.label} later`}
                  onClick={() => moveWithKeyboard(term.id, index + 1, "later")}
                >
                  Later
                </button>
                <span
                  className="term-drag-handle"
                  draggable
                  title={`Drag ${term.label} to another position`}
                  aria-hidden="true"
                  onDragStart={(event) => startDrag(event, term.id)}
                  onDragEnd={() => {
                    draggingTermId.current = null;
                    clearDragTargets();
                  }}
                >
                  ⠿
                </span>
              </div>
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

      <p className="visually-hidden" role="status" aria-label="Term reorder status">
        {announcement}
      </p>

      {issues.length > 0 && (
        <div className="issue-list" role="status" aria-label="Plan issues">
          <strong>Review before committing to this plan</strong>
          <ul>
            {issues.map((issue, index) => (
              <li key={`${issue.type}-${issue.courseCode ?? "catalog"}-${index}`}>
                <span>{issue.message}</span>
                <small>
                  <strong>
                    Suggested fix
                    {issue.suggestion.changeCount === null
                      ? ""
                      : ` (${issue.suggestion.changeCount} change${issue.suggestion.changeCount === 1 ? "" : "s"})`}
                    :
                  </strong>{" "}
                  {issue.suggestion.message}
                </small>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
