import { useMemo } from "react";
import { compareCatalogSnapshots, type CourseField } from "../domain/catalogDiff";
import type { CatalogSnapshot } from "../domain/catalogSnapshot";

interface CatalogChangesProps {
  previous: CatalogSnapshot;
  current: CatalogSnapshot;
}

const FIELD_LABELS: Record<CourseField, string> = {
  title: "Title",
  description: "Description",
  credits: "Credits",
  breadth: "Breadth",
  prerequisites: "Prerequisites",
};

export function CatalogChanges({ previous, current }: CatalogChangesProps) {
  const diff = useMemo(
    () => compareCatalogSnapshots(previous, current),
    [current, previous],
  );

  return (
    <section className="panel catalog-changes" aria-labelledby="catalog-changes-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Snapshot history</p>
          <h2 id="catalog-changes-title">Catalog changes</h2>
        </div>
        <span className="count-pill">
          {diff.changes.length} change{diff.changes.length === 1 ? "" : "s"}
        </span>
      </div>
      <p className="change-context">
        Comparing <code>{diff.previousSnapshotId}</code> to{" "}
        <code>{diff.currentSnapshotId}</code>. These are synthetic fixture changes
        for demonstrating the engine, not actual U of T calendar changes.
      </p>

      <dl className="change-summary" aria-label="Catalog change summary">
        <div><dt>Added</dt><dd>{diff.summary.added}</dd></div>
        <div><dt>Removed</dt><dd>{diff.summary.removed}</dd></div>
        <div><dt>Modified</dt><dd>{diff.summary.modified}</dd></div>
        <div><dt>Planning impact</dt><dd>{diff.summary.planningImpact}</dd></div>
        <div><dt>Metadata only</dt><dd>{diff.summary.metadataOnly}</dd></div>
      </dl>

      {diff.changes.length === 0 ? (
        <p className="empty-state">No course changes were detected.</p>
      ) : (
        <div className="change-list">
          {diff.changes.map((change) => (
            <article
              className="change-card"
              key={`${change.type}-${change.code}`}
              aria-labelledby={`catalog-change-${change.code}`}
            >
              <div className="change-card-heading">
                <div>
                  <span className={`change-type ${change.type}`}>{change.type}</span>
                  <h3 id={`catalog-change-${change.code}`}>{change.code} · {change.title}</h3>
                </div>
                <span className={change.impact === "planning" ? "status-warning" : "count-pill"}>
                  {change.impact === "planning" ? "Planning impact" : "Metadata only"}
                </span>
              </div>
              {change.type === "modified" && (
                <ul className="field-change-list">
                  {change.fields.map((field) => (
                    <li key={field.field}>
                      <strong>{FIELD_LABELS[field.field]}</strong>
                      <span><del>{field.previous}</del> → <ins>{field.current}</ins></span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
