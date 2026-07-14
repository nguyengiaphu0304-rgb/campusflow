import type { CatalogSnapshot } from "../domain/catalogSnapshot";

interface CatalogProvenanceProps {
  snapshot: CatalogSnapshot;
}

function formatUtcTimestamp(timestamp: string): string {
  return timestamp.replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
}

export function CatalogProvenance({ snapshot }: CatalogProvenanceProps) {
  return (
    <aside className="data-notice" aria-labelledby="catalog-provenance-title">
      <div className="provenance-heading">
        <strong id="catalog-provenance-title">Catalog provenance</strong>
        <span className="snapshot-pill">
          Snapshot v{snapshot.version} · {snapshot.snapshotId}
        </span>
      </div>
      <p>
        Source: {" "}
        <a href={snapshot.source.url} target="_blank" rel="noreferrer">
          {snapshot.source.name}
        </a>
        {" · "}
        <time dateTime={snapshot.source.retrievedAt}>
          Retrieved {formatUtcTimestamp(snapshot.source.retrievedAt)}
        </time>
      </p>
      <p>{snapshot.source.note}</p>
    </aside>
  );
}
