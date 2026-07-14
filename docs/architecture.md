# Architecture

CampusFlow starts as a local-first React application with a framework-independent
TypeScript domain layer. The first release deliberately avoids accounts and a
backend so a student's draft plan never leaves the browser.

## Boundaries

- `src/domain`: prerequisite expressions, graph construction, cycle detection,
  transitive closure, term validation, credit calculations, and the portable-plan
  codec, plus compositional degree and catalog-snapshot validation. It has no
  React dependency and is covered by unit tests.
- `src/data`: a versioned JSON catalog fixture parsed through the same trust
  boundary expected for future snapshots. It is not official academic data and
  is labelled accordingly in source, documentation, and UI.
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

### ADR-003: repair suggestions use an explicit edit-cost model

**Status:** accepted.

Every added or moved course counts as one edit. For a missing prerequisite, the
engine first looks for the earliest later term where moving the affected course
would make the existing plan satisfy the rule. That one-edit repair is minimal.
If the current horizon cannot satisfy the rule, the engine evaluates the nested
prerequisite expression and returns the smallest missing course set.

`all` nodes combine child alternatives by Cartesian product and set union;
`any` nodes preserve alternative paths. Duplicate sets and strict supersets are
pruned, but a larger intermediate set is retained when it may overlap later
work. Final equal-cost options are sorted lexicographically, making suggestions
stable across runs. This can be exponential for adversarial expression trees,
so it is appropriate for bounded catalog rules but not a general-purpose degree
optimizer. Suggestions never mutate state and cover only modeled prerequisites.

### ADR-004: degree progress uses compositional, independently evaluated groups

**Status:** accepted.

Degree requirements use a separate rule tree with required-course, credit,
`all`, and `any` nodes. Credit nodes select catalog courses by explicit code or
breadth label. Planned codes are deduplicated and unknown codes contribute no
credit. This gives the UI one deterministic evaluator without coupling policy to
React or treating display copy as executable logic.

For `any`, the evaluator presents the branch with the greatest completion
fraction, then the fewest missing items, then source order. Empty `all` rules are
vacuously complete; empty `any` rules fail explicitly. Each top-level group is
independent, so a course may contribute to more than one group. Global credit
allocation is a distinct optimization problem and is not implied by this model.

The bundled program is intentionally illustrative and labelled as such in data,
UI, and documentation. It must not be used as an official degree audit. A future
catalog pipeline would need versioned, source-attributed program rules before
real academic requirements could be represented responsibly.

### ADR-005: term reordering has one pure operation and two input paths

**Status:** accepted.

The domain layer exposes an immutable move operation whose destination is the
final zero-based term position. Unknown IDs, non-integer or out-of-range
positions, and identity moves return the original array reference. Moving a term
preserves the term object and its course list; the existing derived validation,
credit, progress, persistence, and graph views then recompute from the new order.

The UI invokes this operation from Pointer Events drag-and-drop and visible
Earlier/Later buttons. The buttons are the complete keyboard and touch-safe
alternative, disable impossible moves, retain focus after a move, and share an
ARIA live announcement with pointer moves. Pointer capture keeps the drag
lifecycle on its handle while hit-testing identifies the term under the mouse,
pen, or touch point. Correctness and accessibility never depend on drag alone.

### ADR-006: catalog snapshots fail closed at a provenance-aware boundary

**Status:** accepted.

Catalog JSON is treated as `unknown` and converted to `Course[]` only by a
version-specific parser. Version 1 requires a snapshot ID, HTTPS source, UTC
retrieval timestamp, explicit provenance note, and a bounded course collection.
It rejects unknown keys rather than silently accepting likely schema mistakes.

Structural checks cap JSON at 1 MiB and bound string lengths, course counts,
group widths, recursive depth, and prerequisite nodes. Semantic checks reject duplicate course codes,
dangling and self references, dependency cycles, empty groups, and duplicate
direct branches. Errors retain JSON-style paths so an ingestion pipeline can
report the exact rejected field. The bundled application throws during startup
if its committed fixture fails this boundary, while CI unit tests exercise both
valid and adversarial documents.

The fixture source points to repository documentation that states it was
hand-authored. It does not imply that U of T published, endorsed, or was queried
for this data. Future upstream ingestion must preserve its real source, retrieval
time, transformation record, and redistribution terms.

### ADR-007: snapshot differences are semantic, deterministic, and conservative

**Status:** accepted.

Only snapshots that already passed the catalog trust boundary may be compared.
The comparison indexes courses by stable code and emits added, removed, and
modified records in lexical order. A missing code is an addition or removal;
the engine deliberately does not guess that two differently coded courses are a
rename.

Modified records contain explicit before/after values for title, description,
credits, breadth category, and prerequisite rules. Credit and prerequisite
changes are classified as planning impact, while descriptive fields are
metadata. This is a conservative product signal, not an academic-advising risk
assessment.

Prerequisite expressions use recursive canonical signatures. Children of
commutative `all` and `any` nodes are sorted, so source ordering alone is
ignored, while operator type and nesting remain significant. Both bundled
snapshots are documented synthetic fixtures; their differences do not represent
historical U of T calendar changes.

### ADR-008: release budgets are deterministic gates, not performance claims

**Status:** accepted.

The production build is measured from committed tooling with no hosted service.
Every generated HTML, CSS, and JavaScript asset is checked in raw bytes and with
level-9 gzip. JavaScript is capped at 250 KiB raw and 80 KiB gzip per asset, CSS
at 20 KiB raw and 6 KiB gzip per asset, and the measured initial artifact at
280 KiB raw and 90 KiB gzip. HTML has an additional 4 KiB raw and 2 KiB gzip
cap. The current build has deliberate headroom without making large regressions
invisible. Missing HTML, CSS, or JavaScript output fails closed.

Accessibility has a zero-violation automated budget for axe rules tagged WCAG
2.0/2.1 A or AA. It runs on the initial page and after importing a populated
plan. The skip link is also verified to move keyboard focus to the main landmark.
This is a regression gate, not a WCAG conformance claim: manual screen-reader,
zoom, reflow, contrast, and cross-browser checks remain release work.

### ADR-009: the offline shell is generated, versioned, and user-updated

**Status:** accepted.

The service worker is generated after the production build so its precache list
contains the exact hashed JavaScript and CSS assets plus manifest and icons. A
SHA-256 digest of filenames and contents supplies a deterministic cache version.
Install fails atomically if any shell response cannot be cached. Activation
deletes only older names under the `campusflow-shell-` prefix.

Navigation is network-first, with cached navigation, `index.html`, and root shell
fallbacks in that order. Same-origin scripts, styles, images, fonts, and the
manifest are cache-first; non-GET and cross-origin requests bypass the worker.
This prevents the offline feature from becoming an unexpected data proxy.

A new worker does not call `skipWaiting` during installation. When a controlled
page detects a waiting worker, it presents an accessible update action; only
that action sends `SKIP_WAITING`, and the page reloads once after
`controllerchange`. The first offline visit cannot succeed until an online load
has installed the shell. Local-storage plan lifecycle remains separate from
cache lifecycle, though clearing all site data removes both.

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

The next architecture milestone deploys immutable previews with post-deployment
smoke checks and an explicit rollback path. Any live academic data must show its
source and retrieval date and must never be presented as official advising.
