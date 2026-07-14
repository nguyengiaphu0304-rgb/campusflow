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
- Visualize the transitive prerequisite graph.
- Persist a draft in browser local storage.
- Export and transactionally import a versioned JSON backup.
- Navigate the core workflow by keyboard, with visible focus and announced
  import results.

## Architecture

The React UI is intentionally thin. Framework-independent TypeScript modules in
`src/domain` own prerequisite evaluation, graph algorithms, plan validation,
credit totals, and portable-file validation. This keeps the decision logic
independently testable and reusable.

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
```

Tests cover prerequisite semantics, graph traversal and cycles, plan validation,
portable-file round trips, and malformed, oversized, unsupported, duplicate,
and unknown import data.

## Demo walkthrough

1. Search for a course and choose a target term.
2. Add it before its prerequisite to see a sequencing explanation.
3. Inspect the graph to trace the prerequisite closure.
4. Export the plan, remove a course, then import the JSON file to restore it.
5. Edit the JSON schema version or a course code and import again; CampusFlow
   reports the error without replacing the current plan.

For a portfolio screenshot, use a 1440 × 900 viewport with the planner and graph
visible. The repository does not include fabricated screenshots or usage claims.

## Portable plan format

Exports are human-readable JSON documents with schema `campusflow-plan` and
version `1`. Imports are parsed entirely in the browser and capped at 256 KiB.
They must contain 1–24 unique terms, no more than 20 catalog courses per term,
valid timestamps and identifiers, and no duplicate courses. Newer versions fail
closed until a migration is deliberately implemented.

## Limitations

- Catalog content is a small fixture and may be outdated or incomplete.
- Degree requirements, exclusions, co-requisites, transfer credits, and
  enrollment capacity are not yet modeled.
- The graph is designed for the fixture scale and has not been performance-tested
  against the full calendar.
- Local storage is device- and browser-specific; exported files are not encrypted.
- Automated component accessibility and end-to-end browser tests remain roadmap
  items.

## License

[MIT](LICENSE)
