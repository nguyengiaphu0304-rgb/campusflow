# Architecture

CampusFlow starts as a local-first React application with a framework-independent
TypeScript domain layer. The first release deliberately avoids accounts and a
backend so a student's draft plan never leaves the browser.

## Boundaries

- `src/domain`: prerequisite expressions, graph construction, cycle detection,
  transitive closure, term validation, credit calculations, and the portable-plan
  codec. It has no React dependency and is covered by unit tests.
- `src/data`: a small illustrative catalog fixture. It is not official academic
  data and is labelled accordingly in both source and UI.
- `src/components`: accessible presentation and interaction components.
- `src/App.tsx`: state orchestration and versioned local-storage persistence.

## Core decisions

### Nested prerequisite expressions

Prerequisites are represented as `course`, `all`, and `any` expression nodes.
This avoids flattening requirements such as `A and (B or C)` into an inaccurate
list. The graph uses all referenced courses for exploration, while validation
evaluates the actual Boolean expression.

### Same-term courses do not satisfy prerequisites

The validator updates its completed-course set only after an entire term has
been checked. This prevents a prerequisite scheduled concurrently from being
silently accepted.

### Local-first persistence

The plan is serialized to a versioned local-storage key. Invalid or unavailable
storage falls back to a safe demo plan. Future schema changes must include a
migration before the key version changes.

### ADR-002: portable plans are versioned and validated transactionally

**Status:** accepted.

Plan backups use a named JSON schema and explicit integer version rather than
exporting raw component state. The domain codec validates the complete untrusted
document before returning a fresh `AcademicTerm[]`; the UI only replaces state
after that success result. This keeps parsing testable and prevents a partial
import from corrupting a valid local plan.

Imports are limited to 256 KiB, 24 terms, and 20 courses per term. IDs, labels,
timestamps, course-code shapes, catalog membership, and uniqueness are checked.
Imported strings are rendered only through React text nodes. Files are parsed
locally and no contents are transmitted. The tradeoff is strict forward
compatibility: a newer schema version fails clearly until an intentional
migration is implemented.

## Data and threat model

The plan contains term labels and course codes. It is user-controlled data and
may reveal academic intentions, but CampusFlow does not require names, student
numbers, credentials, or contact details. Browser local storage and downloaded
JSON files are the only persistence locations.

Threats in scope are malformed or oversized imports, duplicate identifiers,
unknown courses, misleading file types, HTML-like strings, and accidental
replacement of a valid plan. Controls are size limits, structural validation,
allow-listed catalog codes, React's escaped text rendering, and atomic state
replacement. Protecting a downloaded file after it leaves the browser and
malicious browser extensions are outside this application's control.

## Near-term evolution

The next architecture milestone is an import pipeline that converts versioned,
source-attributed catalog snapshots into the domain schema. Any live academic
data must show its source and retrieval date and must never be presented as
official advising.
