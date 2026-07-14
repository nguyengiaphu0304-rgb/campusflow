# Architecture

CampusFlow starts as a local-first React application with a framework-independent
TypeScript domain layer. The first release deliberately avoids accounts and a
backend so a student's draft plan never leaves the browser.

## Boundaries

- `src/domain`: prerequisite expressions, graph construction, cycle detection,
  transitive closure, term validation, and credit calculations. It has no React
  dependency and is covered by unit tests.
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

## Near-term evolution

The next architecture milestone is an import pipeline that converts versioned,
source-attributed catalog snapshots into the domain schema. Any live academic
data must show its source and retrieval date and must never be presented as
official advising.
