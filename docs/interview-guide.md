# CampusFlow interview guide

## Sixty-second explanation

CampusFlow is a local-first React and TypeScript planner that treats course
planning as a constraint problem rather than a form. A framework-independent
domain layer evaluates nested prerequisite expressions, validates multi-term
plans, builds a dependency graph, suggests minimum modeled repairs, and parses
versioned plan and catalog files through bounded trust boundaries. React owns
presentation and orchestration only. The project is deployed as an installable
PWA through a least-privilege GitHub Pages pipeline, with unit, script, browser,
accessibility, artifact, budget, and live smoke gates.

## Design choices to explain

### Why keep the domain layer independent of React?

Prerequisite and degree rules are policy, not presentation. Keeping them in
pure TypeScript modules makes them deterministic, independently testable, and
portable to a future API or CLI. React components receive computed results and
focus on interaction and accessible explanation.

### Why represent prerequisites as a tree?

A flat list cannot distinguish `A and (B or C)` from `(A and B) or C`. `course`,
`all`, and `any` nodes preserve Boolean meaning. Validation evaluates the tree;
the graph separately includes every referenced edge for exploration.

### How are minimum-change repairs computed?

Each added or moved course costs one edit. `all` nodes combine child options by
set union, while `any` nodes preserve alternatives. Duplicate sets and strict
supersets are pruned, then equal-cost results are sorted for deterministic
output. The search can be exponential for adversarial trees, so catalog input
is bounded and the limitation is documented.

### What are the trust boundaries?

Plan imports and catalog snapshots start as `unknown`. Version-specific parsers
enforce byte, count, string, depth, and graph limits before returning domain
objects. Catalog validation also rejects duplicates, dangling references,
self-dependencies, empty groups, and cycles. UI state changes only after the
entire plan import succeeds, preventing partial corruption.

### Why local-first?

Academic intentions can be sensitive. The MVP needs no collaboration or server
authority, so accounts and a backend would add risk without product value.
Local storage and explicit JSON export keep persistence visible. The tradeoff is
device-specific state and unencrypted exported files.

### How is offline updating kept safe?

The build generates a service worker from exact hashed assets. A new worker
waits instead of activating immediately, and the user chooses when to update.
Only same-origin shell requests are cached; cross-origin and non-GET requests
bypass the worker. Cache names include a content digest and cleanup is confined
to the CampusFlow prefix.

## Testing story

- Unit tests cover Boolean prerequisite semantics, cycles, graph traversal,
  validation, repair alternatives, degree rules, catalog boundaries, semantic
  diffs, and immutable term moves.
- Node script tests exercise exact budget boundaries, PWA generation,
  deployment scope validation, propagation retries, and error paths.
- Playwright drives download and import, failed-import rollback, keyboard focus,
  term reordering, persistence, offline reload, and axe checks in Chromium.
- CI rebuilds one repository-scoped Pages artifact, then the deployed site is
  smoke-tested by fetching every same-scope shell reference.

## Honest limitations to volunteer

The catalog and degree rules are illustrative, not official. The repair cost
model counts edits rather than workload or timetable feasibility. Requirement
groups do not allocate credits globally. Automated axe checks are not a manual
screen-reader audit, and browser coverage is currently desktop Chromium. The
static host cannot provide project-controlled security headers.

## Likely follow-up questions

1. How would you migrate the plan schema without breaking old exports?
2. How would you ingest official calendar data while preserving provenance and
   redistribution terms?
3. When would the repair search become too expensive, and what alternative
   algorithm or heuristic would you use?
4. What changes would collaboration require in the privacy and threat model?
5. How would you prevent a service-worker update from mixing asset versions?
6. Which accessibility risks remain despite the automated suite?
