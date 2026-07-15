# v1.0 release checklist

This checklist separates evidence produced by repeatable automation from manual
verification. An unchecked manual item means "not performed," not "failed" and
not "implicitly covered by axe."

## Blocking automated gates

- [x] Dependency install from the committed lockfile with `npm ci`
- [x] ESLint with zero warnings
- [x] Strict TypeScript type-check
- [x] 52 domain tests
- [x] 15 PWA, budget, deployment, and smoke-script tests
- [x] Production build for `/campusflow/`
- [x] Raw and level-9 gzip asset budgets
- [x] Deployment artifact scope, file, manifest, worker, and CSP validation
- [x] High and critical dependency audit with zero findings
- [x] Desktop Chromium critical-path end-to-end suite
- [x] Zero axe violations for enabled WCAG 2.0/2.1 A and AA rules in the tested states
- [x] GitHub Pages deploy job
- [x] Live smoke verification of HTML, manifest, service worker, and referenced shell assets

Deployment evidence: [GitHub Actions run 29365490857](https://github.com/nguyengiaphu0304-rgb/campusflow/actions/runs/29365490857),
completed successfully on 2026-07-15 after GitHub Pages was enabled.

## Production evidence

- [x] Public URL resolves to the CampusFlow document
- [x] Catalog provenance and the fixture disclaimer are visible
- [x] Demo plan reports zero validation issues
- [x] Overview and planning-workspace screenshots captured from the public site
- [x] No real student data or fabricated product metrics appear in screenshots

The repository screenshots are visual release evidence. The workflow smoke job,
not the screenshots, is the machine-verifiable deployment gate.

## Manual accessibility and compatibility follow-up

- [ ] Complete the primary workflow with NVDA and Firefox
- [ ] Complete the primary workflow with VoiceOver and Safari
- [ ] Review keyboard-only behavior outside the automated paths
- [ ] Review reflow and text spacing at 200% and 400% zoom
- [ ] Review Windows forced-colors/high-contrast mode
- [ ] Exercise drag behavior with touch and pen input
- [ ] Repeat critical paths in current Firefox and Safari

These checks were not performed for v1.0. They are explicitly non-blocking for
this portfolio release because the supported automated boundary is desktop
Chromium, but they remain known accessibility and compatibility risks. CampusFlow
does not claim WCAG conformance or broad cross-browser certification.

## Release decision

A v1.0 tag may be created only after the release-evidence pull request passes
all available blocking automated gates and has no unresolved review concern.
Any later defect is fixed through a reviewed change; rollback uses an auditable
revert through the same Pages pipeline.
