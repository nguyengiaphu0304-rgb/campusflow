import { useMemo, useState } from "react";
import type { Course } from "../domain/course";
import type { AcademicTerm } from "../domain/plan";

interface CourseCatalogProps {
  catalog: readonly Course[];
  terms: readonly AcademicTerm[];
  scheduled: ReadonlySet<string>;
  onAdd: (termId: string, courseCode: string) => void;
}

export function CourseCatalog({
  catalog,
  terms,
  scheduled,
  onAdd,
}: CourseCatalogProps) {
  const [query, setQuery] = useState("");
  const [termId, setTermId] = useState(terms[0]?.id ?? "");
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return catalog;
    return catalog.filter((item) =>
      `${item.code} ${item.title} ${item.breadth}`
        .toLowerCase()
        .includes(normalized),
    );
  }, [catalog, query]);

  return (
    <section className="panel catalog-panel" aria-labelledby="catalog-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Explore</p>
          <h2 id="catalog-title">Course catalog</h2>
        </div>
        <span className="count-pill">{filtered.length} courses</span>
      </div>

      <div className="catalog-controls">
        <label>
          <span>Search courses</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Code, title, or area"
          />
        </label>
        <label>
          <span>Add to term</span>
          <select value={termId} onChange={(event) => setTermId(event.target.value)}>
            {terms.map((term) => (
              <option key={term.id} value={term.id}>
                {term.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="catalog-list" aria-live="polite">
        {filtered.map((item) => {
          const isScheduled = scheduled.has(item.code);
          return (
            <article className="course-row" key={item.code}>
              <div>
                <div className="course-meta">
                  <strong>{item.code}</strong>
                  <span>{item.credits.toFixed(1)} credit</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
              <button
                className="small-button"
                type="button"
                disabled={isScheduled || !termId}
                onClick={() => onAdd(termId, item.code)}
              >
                {isScheduled ? "Planned" : "Add"}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
