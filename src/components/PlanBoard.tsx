import { useRef, useState, type PointerEvent } from "react";
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

  function startDrag(event: PointerEvent<HTMLElement>, termId: string): void {
    if (event.button !== 0) return;
    event.preventDefault();
    draggingTermId.current = termId;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function clearDragTargets(): void {
    document.querySelectorAll(".term-card.drag-target").forEach((element) => {
      element.classList.remove("drag-target");
    });
  }

  function termAtPoint(clientX: number, clientY: number): HTMLElement | null {
    return document.elementFromPoint(clientX, clientY)?.closest<HTMLElement>(".term-card") ?? null;
  }

  function updateDragTarget(event: PointerEvent<HTMLElement>): void {
    const termId = draggingTermId.current;
    if (!termId) return;
    clearDragTargets();
    const target = termAtPoint(event.clientX, event.clientY);
    if (target?.dataset.termId !== termId) target?.classList.add("drag-target");
  }

  function finishDrag(event: PointerEvent<HTMLElement>): void {
    const termId = draggingTermId.current;
    const target = termAtPoint(event.clientX, event.clientY);
    const destinationIndex = terms.findIndex((term) => term.id === target?.dataset.termId);
    if (termId && destinationIndex !== -1) announceMove(termId, destinationIndex);
    draggingTermId.current = null;
    clearDragTargets();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
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
                  title={`Drag ${term.label} to another position`}
                  aria-hidden="true"
                  onPointerDown={(event) => startDrag(event, term.id)}
                  onPointerMove={updateDragTarget}
                  onPointerUp={finishDrag}
                  onPointerCancel={() => {
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
