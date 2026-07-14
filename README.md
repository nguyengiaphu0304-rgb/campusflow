# CampusFlow

A privacy-first University of Toronto course-planning prototype that makes
prerequisite relationships and sequencing mistakes visible before registration.

> **Important:** the bundled catalog is illustrative fixture data, not an
> official or complete U of T calendar. CampusFlow is decision support, not
> academic advice.

## Why this project exists

Degree planning is a constraint problem presented to students as lists and
calendar pages. CampusFlow explores a more legible model: nested prerequisite
rules are evaluated as Boolean expressions, a dependency graph exposes the
paths behind a course, and a multi-term validator explains invalid sequences.

The current release is local-first. It has no account, analytics, server, or
network persistence, so a draft plan stays in the browser unless the user
explicitly exports it.

## Current capabilities

- Search an illustrative course catalog and build a multi-term plan.
- Evaluate nested `all`/`any` prerequisite expressions.
- Reject same-term prerequisites, duplicates, unknown courses, and catalog cycles.
- Explain each conflict with a deterministic minimum-change repair suggestion.
- Evaluate compositional course and credit requirement groups with live progress.
- Reorder academic terms by pointer drag or equivalent Earlier/Later controls.
- Load a versioned catalog snapshot only after structural, graph, and provenance validation.
- Compare validated snapshots with deterministic, planning-impact-aware explanations.
- Visualize the transitive prerequisite graph.
- Persist a draft in browser local storage.
- Export and transactionally import a versioned JSON backup.
- Navigate the core workflow by keyboard, with visible focus and announced
  import results.

## Architecture

The React UI is intentionally thin. Framework-independent TypeScript modules in
`src/domain` own prerequisite evaluation, graph algorithms, plan validation,
credit totals, portable-file validation, and the catalog trust boundary. This
keeps the decision logic independently testable and reusable.

See [architecture and ADRs](docs/architecture.md) for boundaries, the data and
threat model, and design tradeoffs. See the [scoped roadmap](docs/roadmap.md) for
truthful release progress.

## Local setup

Requirements: Node.js 20.19 or newer and npm.

```bash
git clone https://github.com/nguyengiaphu0304-rgb/campusflow.git
cd campusflow
npm ci
npm run dev
```

Open the local URL printed by Vite. No environment variables or external
services are required.

## Verification

Run the same checks enforced by CI:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run budget
npm run audit
```

Tests cover prerequisite semantics, graph traversal and cycles, plan validation,
portable-file round trips, malformed, oversized, unsupported, duplicate, and
unknown import data, degree-rule alternatives, credit selectors, term reordering,
catalog schema limits, provenance, dangling references, cycles, and semantic
snapshot differences. The
dependency audit fails on high or critical known
vulnerabilities.

The production build also fails if any JavaScript asset exceeds 250 KiB raw or
80 KiB gzip, any CSS asset exceeds 20 KiB raw or 6 KiB gzip, or the measured
HTML/CSS/JS total exceeds 280 KiB raw or 90 KiB gzip. The checker reports every
asset and uses deterministic level-9 gzip locally and in CI. These artifact
budgets prevent silent bundle growth; they are not claims about runtime speed on
a particular device or network.

Browser tests use Playwright with Chromium. Install its browser once, then run:

```bash
npx playwright install chromium
npm run test:e2e
```

The suite drives real downloads, file selection, pointer and keyboard term
reordering, verifies atomic failure and persistence behavior, checks keyboard
focus, and requires zero axe violations against WCAG 2.0/2.1 A and AA rules on
both the initial page and an interaction-populated plan. CI installs Chromium
with its Linux system dependencies automatically. Automated rules do not replace
manual screen-reader, zoom, reflow, keyboard, or assistive-input testing.

## Demo walkthrough

1. Search for a course and choose a target term.
2. Add it before its prerequisite to see both the conflict and smallest modeled fix.
3. Inspect the graph to trace the prerequisite closure.
4. Export the plan, remove a course, then import the JSON file to restore it.
5. Edit the JSON schema version or a course code and import again; CampusFlow
   reports the error without replacing the current plan.
6. Compare the illustrative requirement groups before and after the plan changes;
   the closest permitted path explains what remains.
7. Drag a term onto another position, or use its Earlier/Later buttons; notice
   prerequisite validation update immediately and the order persist on reload.
8. Inspect Catalog provenance to see the active snapshot ID, schema version,
   linked source note, and retrieval timestamp.
9. Review Catalog changes to distinguish planning-impact changes from metadata
   edits across the two explicitly synthetic bundled snapshots.

For a portfolio screenshot, use a 1440 × 900 viewport with the planner and graph
visible. The repository does not include fabricated screenshots or usage claims.

## Portable plan format

Exports are human-readable JSON documents with schema `campusflow-plan` and
version `1`. Imports are parsed entirely in the browser and capped at 256 KiB.
They must contain 1–24 unique terms, no more than 20 catalog courses per term,
valid timestamps and identifiers, and no duplicate courses. Newer versions fail
closed until a migration is deliberately implemented.

## Catalog snapshot format

The bundled JSON uses schema `campusflow-catalog` version `1`. It records a
URL-safe snapshot ID, an HTTPS source URL, an ISO 8601 UTC retrieval timestamp,
a provenance note, and bounded course records. JSON is capped at 1 MiB, parsed
from `unknown`, and fails closed on malformed fields, unexpected keys, duplicate codes,
dangling or self references, cycles, empty groups, duplicate direct branches,
or excessive prerequisite depth and size.

The current source is a documented hand-authored fixture, not upstream U of T
data. See [fixture provenance](docs/fixture-catalog.md).

Snapshot comparison matches courses by code and produces a stable lexical order
with explicit before/after values. Credit and prerequisite changes are marked as
planning impact; descriptive metadata changes are kept separate. Recursive
`all`/`any` branches are canonicalized so child order alone is not reported as a
change while operator type and nesting remain meaningful.

## Limitations

- Catalog content is a small fixture and may be outdated or incomplete.
- Catalog version 1 has validation and deterministic comparison, but no schema
  migration or automated upstream retrieval.
- The requirement fixture is not an official degree audit. Exclusions,
  co-requisites, transfer credits, enrollment capacity, and calendar-year rules
  are not modeled.
- Courses may count in multiple independent progress groups. Cross-group credit
  allocation and optimization are deliberately outside the current model.
- The graph is designed for the fixture scale and has not been performance-tested
  against the full calendar.
- Local storage is device- and browser-specific; exported files are not encrypted.
- Automated accessibility checks find many common defects but do not replace
  manual screen-reader, zoom, contrast, and keyboard testing.
- Pointer drag behavior can vary with browser and assistive input combinations.
  The visible Earlier/Later controls provide the supported non-drag alternative.

## License

[MIT](LICENSE)
