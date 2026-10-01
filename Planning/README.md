# Waypoint implementation planning pack

Start with [the complete phase-by-phase plan](IMPLEMENTATION_PLAN.md). It covers the competition booklet, team specification and finalized NOVA UI, with dependencies, tasks, completion gates, acceptance scenarios and release deliverables.

| Document | Purpose |
|---|---|
| [Implementation plan](IMPLEMENTATION_PLAN.md) | What to build, in what order, how the system connects, and when each phase is complete |
| [82-page UI checklist](UI_SCREEN_CHECKLIST.md) | Every supplied screen, modal, variant, failure state and design-note page mapped to behavior and a phase |
| [Requirements matrix](REQUIREMENTS_MATRIX.md) | All supplied numbered requirements, Dispatcher summary areas, NFRs, team additions and competition obligations |
| [Decisions and gaps](DECISIONS_AND_GAPS.md) | 25 source conflicts/input gaps with proposed treatments and the acceptance gates they affect |

## Phase overview

| Phase | Result |
|---:|---|
| 0 | Freeze source/design baseline; obtain datasets/assets; resolve critical policy conflicts |
| 1 | Reproduce NOVA components and all 82 reference page states |
| 2 | Establish shared data, authentication/scoping, audit, persistence and reliable event/sync contracts |
| 3 | Complete brand-aware Store ordering, status, settings and communication |
| 4 | Complete assisted allocation, constraint validation, deferrals and versioned publication |
| 5 | Complete Loader checks, partial loads, offline checklist recovery and plan-change re-verification |
| 6 | Complete Driver execution, proof, safe interaction, offline delivery and conflict reconciliation |
| 7 | Complete Store receipt, evidence-backed disputes, resolution and cross-role notifications |
| 8 | Complete Live Board, reference/history views and operational forecast/what-if features |
| 9 | Verify complete workflows, exact supplied UI, responsive layouts, security, recovery and performance |
| 10 | Deploy and package Hackathon system, judge walkthrough, docs and video |
| 11 | Build Datathon Task 1 labels, service-time model and lateness model |
| 12 | Build Datathon Task 2A ten-week ordered-volume forecast |
| 13 | Complete Task 2B peak-day allocation/policy and reproducible Datathon package |
| 14 | Close every remaining retained requirement/design gap and hand over the full system |

Phases describe dependency and acceptance order. They do not authorize omitting lower-priority features or postponing a mandatory Hackathon capability beyond its deadline. Data/model work may proceed independently once its inputs are available.

## Readiness and limits

Reviewed: 33 booklet pages, 16 team-specification pages and all 82 UI pages. Original PDFs are unchanged. Text extracts, rendered UI references and [source checksums](source-review/source-inventory.json) are retained locally in `source-review/`.

The workspace did not contain application code, CSV datasets, original design assets/fonts, model files or the separately referenced detailed Dispatcher requirements. The plan does not claim those inputs were validated. Its checks establish planning coverage, not working software or pixel-perfect implementation.

Three decisions deserve early attention: post-cutoff edits versus edits until loading; Driver proof capture missing from the UI; and phone layouts required for Loader/Store but not supplied in NOVA. Existing designs remain the baseline while those gaps are resolved explicitly.

Booklet deadlines, Asia/Colombo: Designathon **29 September 2026, 23:59**; Hackathon **4 October 2026, 23:59**; Datathon **9 October 2026, 23:59**. The plan is dated 1 October 2026 and does not assume the earlier submission was completed.
