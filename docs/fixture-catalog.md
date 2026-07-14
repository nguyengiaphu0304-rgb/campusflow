# Illustrative catalog fixture

`src/data/catalog.v1.json` is a hand-authored fixture created for CampusFlow's
tests and product demonstration. It is not scraped from, published by, or
endorsed by the University of Toronto. Course names and relationships are
deliberately incomplete and may not match any current academic calendar.

## Provenance

- Maintainer: CampusFlow repository
- Snapshot ID: `illustrative-2026-07-14`
- Schema: `campusflow-catalog` version `1`
- Recorded retrieval time: `2026-07-14T00:00:00.000Z`
- Upstream retrieval: none; the timestamp records when this repository fixture
  was captured, not when official university data was fetched
- Intended use: deterministic development, automated testing, and UI demos
- Prohibited interpretation: official academic advice or a complete degree audit

`src/data/catalog.previous.v1.json` is a second synthetic state used only to
demonstrate snapshot comparison. Its additions, removals, credit changes, and
prerequisite changes were deliberately invented for deterministic tests. They
must not be interpreted as changes made by U of T.

Any future real catalog snapshot must use a direct source URL, an honest
retrieval timestamp, documented transformation steps, and terms that permit its
redistribution. It must pass the same structural and semantic validation before
being exposed to planning logic.
