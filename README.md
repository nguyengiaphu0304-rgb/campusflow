# CampusFlow

CampusFlow is a local-first academic planning workspace that turns course
prerequisites into a graph you can inspect and a plan the software can validate.
It is designed as decision support, not as a substitute for official academic
advising.

## Why this project exists

A course list answers “what can I take?” poorly when requirements span several
terms and contain combinations such as `A and (B or C)`. CampusFlow models those
requirements explicitly, checks the order of a multi-term plan, and reveals the
dependency path visually.

## Current capabilities

- Search an illustrative course catalog and add courses to four academic terms.
- Detect missing prerequisites, duplicate courses, unknown courses, and catalog
  cycles.
- Evaluate nested `all`/`any` prerequisite expressions without flattening them.
- Visualize transitive prerequisite paths in a scrollable SVG graph.
- Keep the plan in versioned browser storage with no account or server.
- Respect keyboard navigation, visible focus, reduced-motion preferences, and
  responsive layouts.

> **Data disclaimer:** the bundled course records are deliberately limited demo
> fixtures. They are not the official University of Toronto Academic Calendar
> and may not reflect current requirements.

## Quick start

Requirements: Node.js 20.19 or newer.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

GitHub Actions runs the same quality gates for every pull request and push to
`main`.

## Architecture

The React UI depends on a framework-independent TypeScript domain layer:

```text
UI components → application state → prerequisite expressions
                                ↘ graph + plan validation
```

The domain layer builds forward and reverse graph indexes, detects catalog
cycles with depth-first search, computes transitive prerequisite closure, and
validates each term against only the courses completed earlier. See
[`docs/architecture.md`](docs/architecture.md) for the decisions and tradeoffs.

## Privacy and security

- The current version has no authentication, analytics, database, or network
  request.
- Plans are stored only in the browser's local storage.
- No secrets or personal data are required.
- Dependency updates are monitored by Dependabot.

## Project status

This repository is in active development. The validated planning foundation is
complete; trustworthy catalog ingestion, richer requirement rules, end-to-end
tests, deployment, and an accessible drag-and-drop experience are planned. See
the [`roadmap`](docs/roadmap.md).

## License

MIT
