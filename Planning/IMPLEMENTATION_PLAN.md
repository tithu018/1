# Waypoint — phase-by-phase implementation plan

Prepared 1 October 2026, Asia/Colombo. This is a planning deliverable, not a claim that the system has been implemented.

## Read this first

Build **one connected, responsive delivery-coordination web system with four role-scoped workspaces**, using the finalized NOVA PDF as the visual baseline. Preserve its page compositions, navigation, illustrations, controls, colors, brand variants, and failure states. Implement the shared data and workflow beneath those screens; do not replace them with a generic dashboard.

This plan covers the full supplied scope, including Must, Should, Could, team-proposed additions, UI-only behavior, competition deliverables, and all three Datathon tasks. Priorities determine implementation order; they do not silently remove requirements. Some requirements conflict with the UI or lack a designed interaction. Those are explicitly tracked in [DECISIONS_AND_GAPS.md](DECISIONS_AND_GAPS.md), rather than resolved by inventing a new design.

Companion documents:

- [UI_SCREEN_CHECKLIST.md](UI_SCREEN_CHECKLIST.md): every one of the 82 NOVA PDF pages, its behavior, implementation phase, and verification.
- [REQUIREMENTS_MATRIX.md](REQUIREMENTS_MATRIX.md): requirement-to-phase traceability and acceptance evidence.
- [DECISIONS_AND_GAPS.md](DECISIONS_AND_GAPS.md): conflicts, missing inputs, proposed treatments, and affected release gates.
- [source-review](source-review/): extracted text, 82 rendered UI pages, and contact sheets used during review. These are local review artifacts, not application code or a public dataset.

Source references throughout use physical PDF page numbers:

| Ref | File | Pages | Authority |
|---|---|---:|---|
| B | [Challenge Booklet.pdf](../Source/Challenge%20Booklet.pdf) | 33 | Competition rules, operating constraints, scoring, data definitions, and submission requirements |
| R | [RootCode.pdf](../Source/RootCode.pdf) | 16 | Team's functional/non-functional scope and cross-role commitments |
| U | [N0VA (1).pdf](../Source/N0VA%20%281%29.pdf) | 82 | Finalized visual designs and illustrated interaction states |

All three PDFs were read; all 82 UI pages were also visually inspected. The supplied folder contains PDFs only: no application code, CSV datasets, trained models, original design file, or complete separate Dispatcher requirements document was present during review. R p.8 mentions 105 Dispatcher functional and 23 non-functional requirements, but only summarizes them in 16 areas and seven NFR categories. This plan covers every published area; it cannot reconstruct the unseen individual requirements with certainty.

## 1. What each document says

### Competition booklet

Waypoint serves 120 outlets: 80 Fresh, 25 Style, and 15 Tech, from Peliyagoda and Kandy. The 60 vehicles are 12 refrigerated trucks, 40 dry-box trucks, and eight vans; four vans are refrigerated, so 16 vehicles can carry chilled goods. Vehicles belong to a home depot and have a driver; existing-fleet driver availability is not a separate allocation constraint. Each vehicle may run at most two routes per operating day. Operations follow the supplied calendar and Monday–Saturday schedule. [B pp.3–7]

Fresh orders include separate dry and chilled orders for the same outlet/day and must arrive before 08:00 within the outlet's window. Style orders are weekly, volume-heavy, and often constrained by mall slots. Tech orders are as needed, heavy/high-value/fragile, often a single item. Orders for the next delivery day close at 16:00; later orders wait for the following run. [B pp.3–5]

The system must address fragmented planning, poor live visibility, unrecorded/repeated deferrals, missing proof and loading feedback, weak demand anticipation, missing service-time/lateness predictions, and unreliable field connectivity. The Hackathon requires a responsive web application, not just screens or a native app. Judges must complete the entire four-role workflow. [B pp.4,7,12]

The Datathon is separately judged and integration into the Hackathon is optional under the booklet. It requires handling-time and lateness predictions, ten-week depot/brand demand-volume forecasts, and feasible peak-day allocation with an explained prioritization policy. The team's own R document also commits to operational forecast and prediction features; this plan retains those while keeping the competition submissions independently reproducible. [B pp.15–23; R pp.9,15]

### Team specification

R turns the challenge into one shared lifecycle, immutable audit history, automatic cross-role notifications, depot/outlet/trip access boundaries, brand-aware screens, and role-specific offline behavior. Its important additions are line-level loader/driver/store evidence comparison, fair attribution, one-time issue reopening, priority-preserving deferral rollover, calendar-aware ordering, explanatory assisted planning, prediction-supported capacity decisions, and recovery from plan changes after loading. [R pp.1–16]

The four interfaces have different working conditions: a dense keyboard-operable Dispatcher desktop, a simple Store desktop/phone experience, a fast shared Loader terminal, and a phone-first Driver experience following **Drive → Stop → Interact → Drive**. Loader work starts with staged goods; inbound receiving is out of scope. [R pp.5,8,10–14]

### Finalized UI

NOVA contains public/authentication pages U1–15; Store pages and brand variants U16–37; Dispatcher pages U38–53; Loader pages U54–65; Driver execution, sync, and display pages U66–82. Several pages are modals, alternate states, or design explanations, not independent routes. The visible product name is **Waypoint**; the filename NOVA does not authorize renaming it.

Its main demonstrated scenarios are:

1. Fresh OUT010 ordering, repeated chilled deferrals, and receipt of an earlier short delivery.
2. Assisted planning with two failures, moving OUT012 to VEH036, deferring ORD0096862 with a reason, and publishing v1.
3. VEH025 becoming unavailable, swapping to VEH009, publishing v2, and Loader re-verification.
4. Loading VEH012 in reverse stop order with one damaged carton and a documented partial load.
5. Driver delivery through connectivity loss, explicit sync conflict review, and a trip-end gate until all records are acknowledged.
6. Store/Dispatcher resolution of ISS-0417 through three-way evidence and a loading-stage credit outcome.

Use these as deterministic visual/interaction fixtures. Distinguish prototype sample records from verified competition data and live operating records.

## 2. Non-negotiable implementation rules

1. **No redesign.** U is the baseline for every shown state. Do not substitute illustrations, fonts, generic components, sidebar structures, colors, tables, charts, maps, or mobile navigation. Extract original PDF assets where possible; obtain source assets where needed. Do not generate replacement artwork.
2. **No hardcoded fake functionality.** Buttons, filters, counts, acknowledgement states, constraints, loading checks, and synchronization must derive from real persisted state. Keep a clearly isolated fixture mode for exact screenshot comparison.
3. **One shared domain.** Fresh/Style/Tech use the same application and canonical identifiers. A Store's brand comes from its registered outlet; a role selector never grants permissions.
4. **Booklet constraints remain enforced.** A visually accurate but invalid allocation is not complete. Prototype example times or totals never override validated rules.
5. **Separate evidence from assumptions.** Label proposed engineering choices, fixture values, unknown formulas, and missing inputs. Do not claim 105 individually verified Dispatcher FRs from a summary.
6. **Retain every requirement.** Unshown requirements remain in the matrix and decision register; they must not be implemented through unapproved new UI or quietly omitted.
7. **No false success.** Server-confirmed, saved locally, waiting to sync, failed, and needs review are distinct. A local timestamp cannot decide whether an order met the server cutoff.
8. **No destructive reconciliation.** Corrections, canceled orders, plan revisions, and both sides of sync conflicts remain auditable.

## 3. System architecture and shared contracts

The documents do not mandate a technology stack. Use a responsive browser client with PWA capabilities, a transactional API, a relational database, a background worker, private evidence storage, and a replaceable allocation/prediction boundary. Choose and pin concrete frameworks in Phase 0 according to the team's experience; do not spend the delivery window migrating stacks or introducing unnecessary services.

### Component responsibilities

| Component | Responsibility |
|---|---|
| Browser application | Four authenticated workspaces; shared NOVA components; public/auth screens; per-role navigation; localization; responsive rendering |
| Local durable store + service worker | Cached assigned Driver trips and application shell, local outcome/proof outbox; Store drafts; Loader checklist recovery; account/device-scoped storage |
| API/domain modules | Authentication, policy checks, orders, planning, loading, delivery, receipt, issues, reference data, messages, audit, forecast access |
| Relational database | Authoritative records, constraints, plan versions, event history, scope membership, idempotency keys, transactions |
| Worker + transactional event outbox | Reliable notifications, retries, forecast runs, scheduled reminders, cross-role update fan-out |
| Evidence storage | Private photo/signature objects, metadata, scoped retrieval, upload retries, retention of proof for at least 90 days |
| Allocation module | Suggested plans, full constraint validation, manual-change revalidation, swap alternatives and explanations; replaceable internal API |
| Forecast/prediction module | Versioned predictions and deterministic baseline output; separate training/export pipeline for Datathon |
| Deployment stack | Client/API/worker/database/storage dependencies, migrations, seed import, health checks, configuration and complete startup through root Docker Compose |

A modular service is sufficient; microservices are not required by any source. Real-time transport can be event streaming or equivalent, with periodic refresh recovery. Persistence and access checks belong on the server, not only in UI controls.

### Data model to implement in Phase 2

| Entity group | Required fields/relationships |
|---|---|
| Identity and scope | Account, role, outlet_id or depot grant, driver assignment, preferred language, session; Loader terminal identity/depot and authenticated setup |
| Master data | Depot, Outlet, Vehicle, CalendarDate, DistrictTravel, ServiceAllowance, TrafficSpeed, RoadCondition; preserve supplied IDs and units |
| Catalog and order | Sample/operational Product with brand, category, packing unit, unit weight/volume, temperature, declared value, fragility; Order, OrderLine, version, submitted_at, confirmed_at, requested date, scheduled run, status history |
| Outlet operations | Receiving/access notes, closure/change requests, effective dates, approval/audit history; do not silently overwrite master identifiers |
| Planning | PlanningRun, immutable PlanVersion, Trip, RouteStop, Allocation, ConstraintResult, proposal explanation, publication event; each served order assigned once |
| Deferral | Order/run linkage, reason code, note, next operating date, original age/priority, consecutive-skip history, supervisor exception where applicable |
| Fleet utilization | Workshop/unavailable periods, trip assignment, scheduled start/end, weekly fuel ledger and reservations; no third trip or overlapping use |
| Loading | LoadSession and plan version, reverse-order acknowledgement, reefer reading/check, LoadLine counts, Flag, revisions, confirmation and re-verification records |
| Delivery | TripExecution, StopOutcome, event/device/server timestamps, planned versus actual timing, goods counts where specified, ProofAsset references, trip problem reports |
| Receipt and cases | ArrivalConfirmation, Receipt and line counts, reservation, IssueCase, evidence links, lifecycle events, attribution decision, resolution, single reopen counter, credit/replacement record |
| Communication | Notification and acknowledgement per recipient, channel delivery attempt, linked message thread, critical alert and resolution note |
| Reconciliation and audit | DeviceOperation with unique operation_id, base entity/plan version, local sequence, payload hash, server acknowledgement, SyncConflict and resolution; append-only AuditEvent |
| Forecast and performance | ForecastRun/version/horizon/inputs, per-depot/brand/week volume, derived capacity assumptions, service/lateness predictions, verified stage-attribution performance events |

An order and an outlet are different identities: one outlet may have multiple orders and multiple route stops. Preserve `delivery_id`, `route_id`, and `seq_in_route` linkage. Displayed stop numbers may be 1-based, while dataset sequences start at 0. Store explicit mapping rather than changing dataset IDs.

### State contracts

- **Order:** draft-local → Submitted → Confirmed → Allocated → Loaded → Out for delivery → Delivered. Deferral records move an unserved order to a future run without erasing its history. Cancellation is an audited state, not database deletion. Separate Driver-delivered from Store receipt-confirmed.
- **Plan:** draft version → validated → published version. A change makes a new draft/version; old publication remains available. Publishing atomically revalidates current orders, fleet, locks, and constraints.
- **Loading:** not started → loading → loaded; a relevant published change produces plan changed/re-verification required. Old checks cannot automatically authorize the new plan.
- **Trip:** assigned/not ready → ready after load hand-off → active; paused/resumed where approved → all stops visited → finalized only once records are server-confirmed, matching U79–80.
- **Stop:** pending → safely stopped → delivered or cannot-deliver; issue state and sync state are separate. An offline marker is not a fabricated physical delivery outcome.
- **Issue:** Reported → Acknowledged → Under review → Resolved → confirmed, or reopened once. A resolution must include evidence, stage attribution where verified, outcome, and required note.
- **Sync:** local pending → uploading/syncing → acknowledged; failures stay retryable; conflicting versions go to explicit review. Do not mark proof synchronized until its upload and linked record are acknowledged.

Use stable internal enums and a single shared UI label/icon/color mapping. Resolve the R wording aliases “Received/Confirmed” and “Departed/Out for delivery” through mappings, avoiding confusion with Store receipt.

### API/action contract

Define typed schemas for session and scope; master-data reads; order draft/submit/revise/cancel; planning queue; allocation propose/validate/move/defer/publish; workshop changes; loading checks/flags/confirmation; trip start/pause/resume/outcomes/end; proof upload; receipt confirmation; issue acknowledge/review/resolve/reopen; notification acknowledgement; linked messages; sync batch/conflict resolution; forecast and what-if.

Every mutation carries an idempotency key and, for editable shared records, an expected version. Every result supplies a record ID and status or an actionable error. Authorization is checked against every referenced entity. Persist domain changes, audit events, and outgoing notification events in the same transaction where they must succeed together.

## 4. Phase sequence

Each phase has a completion gate. UI work can proceed with contract fixtures while related services are built, but a phase is not complete until its required real workflow passes. The main dependency chain is **P0 → P1/P2 → P3 → P4 → P5 → P6 → P7 → P8 → P9 → P10**. P11–P13 use the shared data foundation and culminate in the Datathon release; P14 is full-scope closure and operational handover, not permission to drop earlier requirements.

### Phase 0 — Freeze the source baseline and resolve implementation-critical gaps

**Inputs:** B1–33, R1–16, U1–82. **Owner:** team lead/domain owner plus design owner.

1. Record checksums and retain immutable source copies. Use U page numbers as the UI acceptance IDs.
2. Load the screen checklist and requirements matrix into the team's work tracker with owners, dependencies, acceptance checks, and status.
3. Resolve the critical behavior decisions in the gap register: post-cutoff edits; missing Driver proof/count capture; Driver goods-issue reporting; Loader identity; unprovided mobile layouts; exact font/assets; example schedules versus actual windows.
4. Obtain the competition CSVs, submission templates, and `check_allocation.py` through the authorized team access. B7/B31 contain the dataset folder link; the files are not in this workspace. Do not fabricate missing master data or upload restricted datasets to public services.
5. Obtain the original design export/assets and the separate detailed Dispatcher requirements if available. Keep current planning at the granularity actually supplied until then.
6. Pick and pin the implementation stack, repository name `TeamName_SolutionName`, environment strategy, local seed mechanism, and deployment target. Assign implementation owners by feature; no staffing or effort estimate is assumed from the PDFs.
7. Define two clocks: live server time in Asia/Colombo and an explicitly isolated judge/fixture simulation clock for March UI scenarios. A March fixture must not change production cutoff logic or the October submission calendar.

**Deliverables:** frozen baseline, decision log, accessible input inventory, task ownership, schema/API outline, selected stack and startup skeleton.

**Gate:** no hidden rule conflict is embedded in code. Unresolved gaps have an owner and block only their dependent acceptance; assets and unrelated screens can progress.

### Phase 1 — Reproduce the NOVA visual system and all screen states

**Depends on:** P0 baseline. **Coverage:** U1–82; R consistency/accessibility/UI requirements.

1. Extract and reuse Waypoint logos, the landing hero, Store/Dispatcher/Loader illustrations, Driver landing art, icons, and map artwork. Maintain an asset-to-source-page manifest.
2. Measure each screen at its PDF artboard dimensions. Most desktop artboards are 1440 wide; Driver screens are generally 390 wide, with separate modal artboards. Long pages are intentionally scrollable; do not shrink them to fit one viewport.
3. Build shared components: role shell, top context bar, navigation, cards, typography, buttons, form fields, quantity steppers, chips, status badges, alerts, timeline, tables, progress bars, confirmation cards, modal, upload tile, chart, mobile header and three-tab bottom bar.
4. Reproduce all public/auth, Store, Dispatcher, Loader, and Driver states with deterministic local fixtures. Include disabled controls and failure states, not just happy-path pages.
5. Keep component variants faithful to each screen rather than forcing visually different cards into a generic style. Retain the approved Driver day/night treatment.
6. Use the screen checklist to capture screenshots and compare overlays at the reference dimensions. Review geometry, text wrapping, icon alignment, artwork crop, spacing, modal size, chart axes, and bottom-navigation placement.
7. At unprovided phone/tablet widths, retain information hierarchy and controls while adapting layout. Register these as derived layouts requiring design review; do not claim the PDF supplied a Loader mobile design.
8. Add semantic HTML, keyboard/focus support, screen-reader labels, non-color status cues, and localization infrastructure without changing approved visible geometry. Flag contrast or translation-layout conflicts rather than silently recoloring the design.

**Measured starter tokens from the PDF, not a substitute for a full token audit:**

| Use | PDF value |
|---|---|
| Main canvas | `#F7F3EA` |
| Cards | `#FFFDF8` |
| Sidebar / primary button | `#214E3B` |
| Active navigation | `#2F6B52` |
| Main text / muted text | `#202522` / `#66706A` |
| Light border / table header | `#E7DCC8` / `#F1EADC` |
| Warning background / text | `#F8EAD0` / `#7A5210` |
| Critical background / dark text | `#F6DDD6` / `#9E3B2A` |
| Success surface | `#DCE8DE` |
| Driver night canvas / header / card | `#0E1A14` / `#132820` / `#1A2F25` |
| Desktop shell observations | 280-wide sidebar; content starts at x=320 on representative pages; right inset 40; common card gap 24 |
| Driver observations | 16 side inset; 390-wide artboards; bottom bar 76 high on representative screens |

PDF font metadata uses embedded Type3 subsets and does not reliably identify the original font family. Obtain the font instead of claiming an exact family from visual resemblance. Preserve typography measurements and compare rendered text once available.

**Gate:** all 82 reference pages accounted for, each marked screen/modal/state/documentation; no unexplained visual substitutions. Missing font/assets or required unprovided states remain visible blockers to an “exact fidelity” claim.

### Phase 2 — Establish secure shared data, persistence, and reliable events

**Depends on:** P0. **Coverage:** R OFR1–9 and shared entities, B shared data/architecture, U authentication and shells.

1. Build schema/migrations and import validation for 120 outlets, 60 vehicles, two depots and calendar. Validate uniqueness, foreign keys, capacities, brand totals, fleet types, time formats, and operating dates.
2. Preserve all supplied column values and identifiers. Store clock times and durations distinctly; store business timestamps with timezone context. Use ISO year plus ISO week, not week number alone.
3. Separate genuine supplied records, sample catalog/price data, staged historical fixtures, and live operations. Product packing-unit quantities must reconcile to UI units, weight and volume; never silently convert a pallet count into an individual-item count.
4. Implement account/session security, role/depot/outlet/assigned-trip checks, inactivity timeout, wrong-role handling, password visibility where shown, reset request and acknowledgement. Do not let demo outlet chips bypass live authorization.
5. Set up Loader depot-terminal authentication consistent with the decision log and four-role seeded judge credentials.
6. Implement audit append-only permissions, event outbox, scoped real-time subscriptions, retryable notification channels, private evidence storage, and the sync-operation contract now, before role implementations diverge.
7. Add structured operational logs for failed submissions, publish validation, pending notifications and sync backlog. Logs must not contain credentials or public evidence URLs.
8. Make server saves survive browser refresh; implement optimistic concurrency or trip locking for multiple dispatchers.
9. Create a repeatable local seed command and a resettable demonstration environment. Import logic must report missing data instead of creating plausible-looking replacement records.

**Gate:** a fresh database imports consistently; scopes reject cross-outlet/depot/trip access; mutations produce audit and notification events exactly once under retry; session and recovery screens call real services.

### Phase 3 — Implement Store ordering, status, settings, and communication

**Depends on:** P1/P2. **UI:** U16–24, U28/U30–33/U35/U37. Receipt completion follows in P7.

1. Populate the dashboard with cutoff countdown, next planned arrival/window, receipt tasks, deferral/shortfall notices, recent issue, and calendar guidance.
2. Implement catalog search, categories, favorites, quantity steppers, repeat-last-order, optional Dispatcher note, basket totals, save draft and submit. Fresh dry and chilled lines become separate order records where required; do not merge the two into one incompatible order.
3. Implement Style weekly ordering with cartons and mall slot; Tech pallets/crates, value/fragility and handling notes exactly as U35 shows, while supporting an order of one item. Do not replace U35 with a newly designed single-item form.
4. Enforce the server-side 16:00 new-order cutoff and next eligible operating-run routing; show the correct result to late retries. Define the exact boundary in tests. Use the calendar to skip non-operating dates.
5. U18 must show a real order ID and server receipt timestamp. U19 stores the draft durably, retries safely, retains user input, and never claims submission before acknowledgement.
6. Implement edit/cancel through the agreed cutoff policy. Revisions invalidate affected plan validation and trigger notifications/rechecks; retain original order snapshots and cancellation history.
7. Implement active order list, full status timeline, planned window, shortfall flag, defer reason/new date, consecutive-skip warning and acknowledgement. Never promise an unapproved exact arrival time.
8. Implement notifications with per-user acknowledgement, in-system order/case messaging, preference persistence, outlet-change requests, planned closure and access/receiving-note workflows.
9. Add the team's missing-order reminder and calendar-aware guidance without duplicating previously rolled-over chilled orders.

**Gate:** Fresh, Style and Tech accounts each submit valid orders into the correct Dispatcher queue; offline/cutoff retry does not duplicate them; no Store can read another outlet; edited/canceled orders cannot leave a stale published load plan undetected.

### Phase 4 — Implement assisted planning, constraints, deferrals, and publication

**Depends on:** P2/P3. **UI:** U38–46, U51/U53; shared deferral state U23.

1. Build depot/date context and a queue of all eligible confirmed orders, with new/rolled-over/protected/unusual-quantity counts and filters. Define unusual-quantity baseline rather than hardcoding the 1.6× example.
2. Implement an assisted allocation service: partition by depot, brand and district; honor existing protected priority; search feasible vehicle/trip/stop assignments; return served and deferred candidates, reasons, utilization, and warnings. Human review remains required before publication.
3. Enforce both weight and volume; reefer compatibility; van-only access; home depot; same brand/district per trip; whole orders; workshop availability; maximum two trips per vehicle/day; outlet/mall windows; sequential scheduling; weekly fuel quota; operating-day rules. A single outlet's two orders remain separately allocatable.
4. Calculate operational timing with travel, early-arrival waiting, service allowance/prediction, between-trip return/reload and non-overlap. Do not accidentally use the Datathon's simplified no-return formula for operational route scheduling; see Section 5.
5. Keep a validation result per affected entity and a plain-language explanation. U39 is a draft failure state, not permission to publish an invalid suggestion.
6. Implement manual moves, U40's suggested transfer, U41's deferral options/reasons, capacity utilization, failure filters, and U42's valid result. Recheck within three seconds; cancel/undo must preserve a valid audit trail.
7. Require one decision for every in-scope order: allocated exactly once or deferred with reason and next run. Deferral reasons shown are Capacity full, Temperature vehicle unavailable, Delivery window conflict, Fuel quota, Access restriction, and Other; Other requires a note.
8. Track consecutive skipped runs at outlet level and relevant order/temperature context, preserve order age/priority, surface protected outlets, and require the authorized supervisor exception contemplated in U39 if protection cannot be honored. A supervisor note never overrides physical feasibility.
9. Publish a transactionally validated immutable plan version. Update Store plans/deferrals, Loader queue, and Driver assignments through reliable fan-out; distinguish an assignment preview from permission to depart before load hand-off.
10. Build the breakdown/workshop-loss workflow: hold affected loading, compare swap/split/defer consequences, revalidate the alternative, produce v2, reassign the driver, and send the precise changes to all affected roles. Splitting a route may distribute whole orders; it may not split an individual order.
11. Implement searchable/exportable deferral history, outlet service history, master-data tabs and vehicle status changes. Read-only limits/IDs remain read-only as U53 specifies.
12. Persist handover notes and shared editing locks; flooding, overloaded demand, office restart, and extended offline behavior must be exercised as scenarios rather than assumed covered by the normal path.

**Gate:** no invalid plan can publish, including via direct API calls or concurrent edits. Every order is accounted for. U39→U40→U41→U42→U43→U44 and U45→U46 have real state changes, version history, and downstream delivery.

### Phase 5 — Implement Loader work and safe hand-off

**Depends on:** P4 publication, P1/P2. **UI:** U54–65.

1. Show depot-only daily queue with urgency, vehicle/status filters/sorting, distinct Fresh urgency, temperature and Trip 1/Trip 2.
2. Display reverse delivery sequence, outlet/brand/order, packing units, weight/volume, temperature and dock attributes.
3. Implement U55 ambient readiness and U60 chilled readiness. Chilled loading requires a recorded reefer reading and confirmation plus reverse-order acknowledgement. Temperature policy/acceptable range needs an operational definition; do not invent one from the PDF.
4. Persist checklist lines as physically loaded quantities, not merely visual checkbox values. Support corrections, unchecking and withdrawal of flags until confirmation; all corrections append history.
5. Implement missing/damaged flag, affected quantity, optional note/photo, and explicit saved/failed feedback. Notify Dispatcher and affected Store. A flag quantity cannot exceed the order line.
6. Allow documented partial loads. Every line must be accounted for as loaded and/or flagged; an unexplained unchecked line is not equivalent to a shortfall. U58 displays planned versus loaded totals and known flags.
7. Confirm the load against the current published version, lock the submitted snapshot and make the trip ready for Driver execution. U59 must follow actual server acknowledgement.
8. U61 persists local checklist operations through network loss, reload and terminal lock. Retry reconciles base versions. A pending offline load confirmation must not claim that the Driver has received hand-off.
9. Implement U62–64 for a changed trip: show before/after, already loaded stops that must move, remaining stops, acknowledgement, re-verification and new confirmation. Prevent stale checks or a racing Driver start from bypassing re-verification.
10. Implement loading-issue history with This shift / Yesterday / All and the shared issue lifecycle.

**Gate:** a shortfall reaches Store/Dispatcher and preserves correct counts; documented shortfalls permit hand-off; missing readiness checks and stale plan versions block it; dock connectivity loss does not erase checklist progress.

### Phase 6 — Implement Driver delivery, proof, offline sync, and trip lifecycle

**Depends on:** P5, P2 sync architecture, resolved proof/design decisions. **UI:** U6/U12–15/U66–82.

1. Deliver the phone experience as responsive web/PWA at the same deployed URL. Desktop Driver entry routes to the mobile-width experience rather than requiring an app-store installation.
2. Cache the assigned current plan/trip/stops, outlet access/window notes, expected shortfalls and necessary assets before departure. Show loading readiness and distinguish planned 216 units from actual 215 loaded units in the U66 scenario.
3. Start the selected trip explicitly, show progress and minimal next-stop/ETA/window Drive Mode. Detailed delivery, problem, sync-conflict and route-change decisions require the safely-stopped state.
4. Reproduce the navigation screen and optional navigation entry/exit. U68 is explicitly an illustrative map. Keep a disclosed fixture version for fidelity; do not claim real navigation without outlet coordinates and a routing source. Navigation failure must not block core deliveries.
5. Implement stopped details, early-window waiting, delivered outcome, cannot-deliver reasons and conditional Other note; report trip problems for lateness/access/vehicle/other. Store receives the appropriate outcome, not a fabricated success.
6. Retain R's mandatory Driver proof and count evidence. Add the data/upload capability and complete the missing approved capture interaction before claiming end-to-end completion. A “Mark delivered” tap alone is not the photo/signature/recipient evidence required by R and used by U29/U49.
7. Persist outcomes, proof blobs, issue reports, local sequence, device timestamp and base version before showing U75. Cache must survive an application restart. Detect storage-write/upload failures and keep a retryable record.
8. Sync in causal order, with idempotency and server acknowledgement. Retain local data until linked proof and outcome are durably accepted. Foreground reconnect/manual retry must work even where background sync is unavailable.
9. Implement U76–78: show per-record sync results; review local versus server versions; keep both in audit; authorized choice creates a resolution record. A server connectivity annotation alone should not erase an actual delivery; retain the designed review state for the demonstrated scenario and substantive conflicts.
10. Implement trip pause/resume, stopped-only dispatch updates and progress. These R requirements lack complete corresponding U screens and follow the gap process.
11. U79 shows completion metrics; U80 disables final End trip until all required records reach the server. Keep “all stops visited locally” separate from “trip finalized on server” so offline work is preserved without a false finish.
12. Implement day/night selection, automatic-after-sunset preference and preview U81–82. Define the location/time basis for sunset; derive the palette from U82 rather than a generic dark theme.

**Gate:** a cached trip works with the network disabled, including durable proof/outcomes and restart; reconnection cannot duplicate or overwrite deliveries silently; all shown sync states are reproducible; no record is labeled synced before acknowledgement; complete a full trip through U79.

### Phase 7 — Close the receipt, issue, evidence, and notification loop

**Depends on:** P3/P5/P6. **UI:** U25–32/U34/U36/U48–50/U65.

1. Implement Store arrival acknowledgement and “It hasn't arrived,” then product-by-product receipt. Driver delivery and physical Store receipt must remain independently recorded.
2. Show planned, loaded and received counts; full receipt, short/damaged receipt and reservation behavior follow brand variants/decision register. Prevent “received in full” with inconsistent line counts.
3. Attach affected product/type/quantity, note/photo, and issue ID. Reuse/link prior Loader flags to avoid unrelated duplicate cases for the same shortfall while retaining each reporter's evidence.
4. Implement history and notifications, case status progression, Dispatcher evidence review, mandatory resolution note, and Store outcome acknowledgement or one allowed reopening.
5. Implement actual resolution records: a credit in an outlet ledger or a replacement request routed through planning/loading/delivery. “Send a replacement today” must check capacity and create traceable work; it is not just a success message. No external accounting/payment integration is specified.
6. Compare counts at line level across stages. Missing evidence means unverified, not blame inferred from a default quantity. Verified stage-attributed cases alone create performance adjustments; a Loader shortage must not penalize a Driver.
7. Surface critical operational alerts distinctly and require resolution notes. Send in-app notices plus configured SMS/push for time-critical deferral, ETA and shortfall events in the recipient's chosen language, with delivery/retry tracking.
8. Keep linked order/case messages and replies discoverable from Notifications. Implement missing-order reminders and the unshown feedback/driver-score requirements using the documented design-gap process.

**Gate:** reproduce ISS-0417's 44 expected → 42 loaded → 42 delivered → 42 received loading-stage resolution; test a different evidenced discrepancy and insufficient evidence; notification and ledger/replacement actions are real and audited; reopening twice is rejected server-side.

### Phase 8 — Complete live operations and operational forecasting

**Depends on:** P4/P6/P7; dataset availability. **UI:** U47/U48/U51–53.

1. Implement route progress, next stop, planned-versus-actual timing, ETA/window, late state, offline/sync freshness and critical alerts. Never portray a stale last-known position or time as live telemetry.
2. Use recorded Driver events to refresh Live Board within ten seconds when online; explicitly expose delayed arrival of offline records.
3. Implement weekly demand/capacity display for both depots and all brands, preserving U52's tabs (reefer trips, ambient trips, tonnage), calendar markers, chart/table arrangement and what-if control.
4. Separate forecast ordered volume from estimated trips/vehicles/drivers. Use declared utilization/trip-frequency/capacity assumptions and actual operating days. Capacity cannot be inferred by simply multiplying all vehicles by two every day.
5. Support the displayed one-reefer-truck what-if, shortfall weeks and recommended added vehicles/drivers. Respect constrained vehicle types, volume, weight, access and fuel when interpreting feasible capacity.
6. Provide a clearly labeled deterministic baseline or sample output while the trained model is not available. Preserve the U52 sample disclosure in fixture mode; do not present samples as trained predictions. Replace the provider behind the same contract after P11/P12.
7. Add replaceable per-stop service/lateness estimates and brand service-share fairness metrics. The tonnage tab needs a weight forecast/explicit conversion model beyond Task 2A's volume outputs.
8. Complete searchable/exportable deferral history, reference tabs, supervisor exception handling and shift-continuity behavior.

**Gate:** displayed statistics reconcile with underlying records; forecast sample versus model provenance is clear; what-if is calculated rather than hardcoded; missing model/data does not corrupt operational scheduling.

### Phase 9 — Verify complete workflows, fidelity, resilience, and performance

**Depends on:** integrated P1–P8. **Coverage:** entire requirements matrix and UI checklist.

1. Run the scenario suite in Section 7 from a fresh seeded installation. Include both depots and all three Store brands, not only the exact OUT010 walkthrough.
2. Check every one of 82 UI references at its baseline dimensions with overlays, including modals, long-scroll screens, disabled states and day/night styles. Track baseline discrepancies individually.
3. Exercise Driver and Loader at phone-sized widths, Store at phone and desktop, and Dispatcher desktop without horizontal page scrolling. Validate keyboard focus/shortcuts and screen-reader announcements for important status changes.
4. Test Sinhala, Tamil and English layouts and recipient-language notifications, Colombo times and 24-hour formats. Do not truncate critical translated actions to preserve a screenshot.
5. Fault-test lost responses after server commit, duplicated retries, crash/restart, stale plan version, simultaneous publish/load/start, interrupted proof uploads, offline account changes, notification provider failure and full local storage.
6. Measure 200-order/60-vehicle plan generation ≤30s, manual recheck ≤3s, online event-to-board ≤10s, transitions/filters ≤1s, forecast charts ≤5s. Record hardware/data/network conditions; targets are not proof until measured.
7. Test authorization by API, not only navigation; append-only audit behavior; private proof access; ≥90-day retention configuration; backups and restore.
8. Require explicit empty/loading/error states across every screen, especially unshown cases such as no assigned trip, no orders, unavailable evidence, expired sessions, failed publication and empty forecast.

**Gate:** no unresolved hard-rule, data-loss, authorization, core-workflow or source-fidelity defect. Unresolved requirements are disclosed as incomplete; a polished subset is not called the full system.

### Phase 10 — Package and submit the Hackathon build

**Depends on:** P9 release gate. **Deadline in booklet:** Sunday 4 October 2026, 23:59 Sri Lanka time. [B12–13]

1. Supply public HTTPS deployment and four seeded role credentials, plus extra Store variant/depot fixtures if needed for the walkthrough. Keep authorized datasets/evidence behind appropriate access.
2. Provide a GitHub monorepo named `TeamName_SolutionName`, root `compose.yaml`/Docker Compose file and `.env.example`. `docker compose up` must start the complete stack including database and seed data without manual hidden setup. Reconcile competition-data confidentiality with seed distribution before publishing data.
3. Write README setup/configuration, account details, numbered four-role walkthrough, supported fixture clock/reset, offline demonstration, assumptions, known limitations, and any significant design departures. The requested goal is zero visual departures; recording a departure does not make it authorized.
4. Include root `docs/` architecture diagram, data model, and AI disclosure identifying assisted and unassisted work and how tools were used.
5. Record an unlisted YouTube demo of 5–8 minutes: all roles completing the workflow, degradation/recovery, then code and architecture.
6. Verify a clean clone and startup, public URL and credentials from a separate browser, seeded walkthrough and mobile layouts. Tag/freeze the submission commit before the deadline; code pushed afterward does not count.
7. Submit repository, deployment, seeded credentials and video through the booklet's form. Keep deployment live throughout review and, if advancing, semifinal/Grand Finale periods. Submission itself is a separate external action, not performed by this planning task.

**Gate:** all required artifacts work from outside the developers' environment and match the submitted commit.

### Phase 11 — Datathon Task 1: service time and lateness

**Depends on:** P0/P2 dataset checks. May be developed alongside operational work by the team; final export does not depend on app integration. **Sources:** B15–16,24–30.

1. Join dispatched training orders to route legs on `route_id` + `seq_in_route = seq`; validate exactly one leg per dispatched order. Cross-check outlet/vehicle/date attributes. Never join on outlet alone.
2. Construct date-aware actual arrival, window open/close and leave timestamps. Define **service start = max(actual arrival, window open)** and **service minutes = leave time − service start**. Early waiting is not handling. Define **late = actual arrival > window close**; equality is not late. Late records still represent delivered stops in the scenario.
3. Resolve midnight transitions and malformed/negative durations explicitly. Exclude `not_run` records from observed service/lateness labels, while retaining their demand for Task 2A. Use dispatch-day actual route records for deferred orders that later ran.
4. Use only features available before delivery: order size/temp/brand, dock/access/window, planned route position/departure/travel/arrival, district/depot/vehicle attributes, known calendar context and travel tables. Actual journey/leave times and target-derived future information cannot enter prediction features.
5. Inspect actual schemas before joining traffic/road tables; the booklet documents only selected columns. Ensure disruption information was knowable at prediction time. `service_allowance_min` is a planning allowance, not an observed label.
6. Establish simple train-from-scratch baselines, then compare suitable tabular regression/classification candidates using chronological validation and route/day grouping to reduce leakage. Fit preprocessing on training folds only; document local metrics and calibration without inventing an unpublished official score formula.
7. Save preprocessing and model artifacts with feature schema/version/seed. Predict finite nonnegative handling times and probabilities in [0,1].
8. Fill only `pred_service_min` and `pred_late_prob` in `submission_task1.csv`; preserve every `delivery_id`, all rows and original row order exactly.

**Gate:** label examples include early, on-time, late and deferred deliveries; no actual-data leakage; model reload reproduces inference; submission matches its template exactly.

### Phase 12 — Datathon Task 2A: ten-week demand-volume forecast

**Depends on:** clean P11/P2 order/calendar preparation, not Task 1 labels. **Sources:** B16–17,24–30.

1. Combine `deliveries_train.csv` and `task1_test_inputs.csv`; count each `delivery_id` once. Investigate duplicates/disagreement rather than arbitrary dropping.
2. Include attempted, deferred and never-run orders: all are demand. Assign to the requested `order_date`, not actual dispatch date. Join the supplied calendar for `iso_year` and `iso_week`.
3. Aggregate total `order_volume_m3` and chilled volume by depot, brand and requested week. Use all 10 future weeks in `task2a_test_inputs.csv` with exact supplied keys.
4. Construct prior-week demand, seasonal/calendar/payday/festival-ramp/holiday/monsoon/operating-day features using only known history at each forecast origin. Distinguish true zero demand from missing source data.
5. Backtest the ten-week horizon with rolling temporal origins, compare simple seasonal baselines and train-from-scratch forecasting candidates, and document uncertainty and limitations.
6. Enforce nonnegative totals, `0 ≤ chilled ≤ total`, and **chilled = 0 for Style and Tech**. No conversion into vehicle or driver counts belongs in the required Task 2A CSV.
7. Save model and preprocessing artifacts; fill only `pred_total_volume_m3` and `pred_chilled_volume_m3` in `submission_task2a.csv`, preserving supplied `row_id` and rows.
8. Expose final model output through the existing operational forecast contract if completing R's model integration. Keep U52 intact; document operational trip/tonnage/driver conversion assumptions separately.

**Gate:** count-every-order and requested-week aggregation tests pass, template checks pass, no future leakage, and saved-artifact inference is reproducible.

### Phase 13 — Datathon Task 2B and submission packaging

**Depends on:** scenario/reference datasets and P4's reusable feasibility concepts. **Sources:** B18–23,31.

1. Load S1 Peliyagoda orders, available/workshop fleet, vehicle master, district travel and service allowances. Analyze bottlenecks: reefer capacity, van-only access, weight, volume, time and competing brand demand. Scenario is a week before a festival, not a payday and not monsoon.
2. Use `order_ref` as the allocation key; `outlet_id` can repeat. Assign each order served or deferred; serve only with available vehicles from its home depot.
3. Enforce the exact Task 2B rules and formula in Section 5. Do not use operational ML service predictions instead of the official allowance lookup; do not add return travel into the specified Task 2B duration.
4. Explain prioritization using consecutive skips, time since last service, restricted resources, perishability/urgency and brand fairness. Record which deferrals are unavoidable and which are policy choices, with calculated costs/alternatives. No trained model is required for this task.
5. Preserve `scenario`, `order_ref` and `outlet_id` in `submission_task2b.csv`; set `decision` to `served` or `deferred`; served rows need `vehicle_id` and `trip_id` 1/2; deferred rows must leave those two fields blank. Replace every placeholder and retain all rows.
6. Run supplied `check_allocation.py` plus template/schema checks. Passing proves feasibility under its rules, not optimality; retain the checker output and a policy write-up of about one page or less.
7. Package model/preprocessing/deployment architecture diagrams, preprocessing/label/feature rationale, saved model files, `TeamName_FinalNotebook.ipynb`, all three exact submission CSVs, allocation policy, and AI disclosure.
8. Preserve notebook cells for label construction, preprocessing, training and evaluation. The final cell must load saved models, demonstrate Task 1 and Task 2A inference and clearly print inputs and predictions.
9. Record the 3–5 minute unlisted YouTube Datathon demo explaining model architecture, preprocessing, label construction and challenges.
10. Compress the deliverables as `TeamName_Datathon.zip` and submit by **Friday 9 October 2026, 23:59 Sri Lanka time**. Do not distribute the supplied data or derived data publicly without organizer authorization.

**Model constraints:** no pretrained models except as permitted for synthetic generation/preprocessing; no proprietary API-based modelling/preprocessing; no low-code/no-code AI or fully automated end-to-end modelling tools. Keep data use competition-only and comply with confidentiality, sharing and publication restrictions in B22. AI disclosure does not waive those rules.

**Gate:** all template identifiers/rows match, all artifacts load in a clean environment, allocation checker passes, policy calculations are explainable, final notebook inference works, archive and video satisfy the booklet.

### Phase 14 — Close remaining full-system commitments and hand over

**Depends on:** preceding applicable phases and resolved design gaps. This is a completeness check, not a scope-cut phase.

1. Review every matrix row, including Should/Could and team additions, with demonstrable acceptance evidence. Missing-order reminder, knowledge contribution, receiving-hour changes, feedback/driver score, fairness, what-if, trip pause/resume, shift handover and configuration must each be implemented or explicitly marked incomplete.
2. Keep critical-need signalling as the lowest-priority optional candidate exactly as R15 labels it; obtain an explicit scope decision if excluded. It cannot become a binding allocation override.
3. Finish approved interactions for requirements without U frames. Existing U screens remain unchanged; track any necessary new state as a reviewed extension with provenance.
4. Verify backups/restores, proof retention, device/session lifecycle, monitoring, scheduler jobs, model/version rollback, private exports and runbooks.
5. Demonstrate a third-depot seed/configuration addition without schema restructuring; validate that this does not weaken current access boundaries.
6. Hand over operating instructions for publishing, deferrals, re-verification, offline recovery, disputes, model refresh, judge resets and deployment recovery.

**Gate:** the complete-system claim requires all retained matrix rows satisfied and all critical decisions resolved; competition submission alone is not proof of full R scope.

## 5. Allocation rules: keep operational and Datathon modes distinct

| Rule | Operational application | Datathon Task 2B |
|---|---|---|
| Weight + volume | Both per-trip limits enforced | Both per-trip limits enforced |
| Temperature | Chilled/frozen require reefer; reefer may carry ambient | `chilled` requires `reefer`; ambient allowed on reefer |
| Access/depot | Van-only, mall access, home depot enforced | Van-only and home depot explicitly required; inspect supplied checker for exact tested rules |
| Brand/district | Same brand and district per trip per R and route schema | Same brand/district per `(vehicle_id, trip_id)` |
| Whole orders | One served order on one trip/vehicle | Same; repeated outlet is not a duplicate order |
| Availability | No unavailable/workshop vehicle | Only scenario fleet `available` vehicles |
| Trips | Maximum two per vehicle per day, with feasible sequential schedule | Maximum two total across all brands |
| Timing | Outlet/mall windows, waiting, service, return/reload, non-overlap and applicable daily limits | Official aggregate formula and 270/480 budgets below |
| Fuel | Weekly fuel balance/reservations based on route distance and km/L | Not one of the seven enumerated Task 2B feasibility rules; do not invent hidden scoring constraints; document separately if evaluated |
| Driver availability | Existing fleet has a driver; no separate allocation constraint | No extra driver-availability constraint |
| Decision | Allocate or defer with explicit reason; preserve history/priority | Exact CSV assignment plus separate written prioritization policy |

For Task 2B, each **order** counts as a stop, even at the same outlet:

`trip_minutes = depot_to_district_freeflow_min + (number_of_orders - 1) * inter_stop_freeflow_min + sum(service_allowance_min[brand, dock_type] for each order)`

Count outbound once per trip. **Do not add return travel**; the booklet says its budgets already allow for it. Per vehicle/day, sum Fresh-trip durations ≤270 minutes; sum Style and Tech durations together ≤480 minutes. These are separate windows, but total trips remain ≤2. One Fresh plus one Style trip is allowed if each respective budget passes; three trips are never allowed. The booklet describes Fresh's Task 2B window as 03:30–08:00; the NOVA operational samples include 02:00 departures, so do not transplant those timestamps into a claimed Task 2B schedule.

The operational mode must handle actual windows and weekly fuel even though Task 2B provides a simplified calculation. Implement named validation profiles and test each; never silently conflate them.

## 6. Deadline-aware execution schedule

The client date is 1 October 2026. The Designathon deadline (29 September) is past; this plan does not assume it was submitted. The Hackathon deadline is 4 October and Datathon deadline 9 October, both 23:59 Asia/Colombo. Dates below are execution targets, not a credible fixed estimate for completing an 82-page product from PDFs alone. Team size, existing off-workspace work, and source access must be checked in P0.

| Window | Target | Required checkpoint |
|---|---|---|
| 1 Oct | P0 decisions/data/assets; P1 shared shells; P2 data/auth/events; begin P3 | Running stack, correct source baseline, agreed critical behavior and one real Store-to-queue path |
| 2 Oct | P3/P4 allocation/publication; P5 load hand-off; P6 offline foundation | First real four-role vertical slice, constraints working, offline data survives restart |
| 3 Oct | P6/P7 receipt/dispute/recovery; P8 live/forecast baseline; complete remaining visual states | Demonstrable end-to-end and failure scenarios; screen-by-screen gap report |
| 4 Oct, before final packaging buffer | P9 verification and fixes; P10 deployment/README/video | Freeze only after critical checks; identify any incomplete scope honestly; submit before 23:59 |
| 5–6 Oct | P11 labels/features/models; P12 weekly aggregation/baselines | Leakage checks and reproducible temporal validation |
| 7 Oct | P12 model selection; P13 allocation/policy | Three draft outputs passing schema checks, allocation feasibility confirmed |
| 8 Oct | Clean-run reproduction, final models/notebook, docs/demo/archive | Independent repeatable inference and complete artifact checklist |
| 9 Oct | Final integrity checks and submission buffer | Submit Datathon archive/video before 23:59 |
| Alongside/after releases as needed | P14 unresolved full-system completion | Do not label incomplete commitments as complete merely because a deadline passed |

Assign workstreams to the actual available people: visual/frontend; domain/API/allocation; mobile/offline/integration; data/ML and release verification. These are responsibility groupings, not a claim that four developers are available. Preserve the early vertical slice and offline foundation if capacity is tight; obtain an explicit scope change rather than silently discarding finalized screens.

## 7. Required acceptance scenarios

| ID | Scenario and observable pass condition |
|---|---|
| E01 | Fresh dry/chilled, Style weekly and Tech fragile orders: correct catalog units, separate relevant order records, server confirmation, queue visibility and outlet isolation |
| E02 | Request at 15:59 whose response is lost: idempotent retry returns the same accepted order; request first accepted after cutoff goes to next eligible run; draft remains on failure |
| E03 | Calendar non-operating day: submission, deferral and planning choose the proper operating run; shared festival/payday context agrees across screens |
| E04 | Constraint battery: overweight, over-volume, chilled-on-ambient, truck-to-van-only, wrong depot, mixed brand/district, workshop vehicle, split order, third trip, fuel overrun and missed window are rejected |
| E05 | NOVA draft failure sequence: U39 failures visibly block publication; move and reasoned defer produce the U42-valid state and U43–44 publication |
| E06 | Repeated deferral: history recognizes skipped operating runs and protects priority; every exception is justified; reason/new date reaches Store and CSV export |
| E07 | Breakdown/workshop loss: v2 publication invalidates affected loading readiness; moved and remaining goods are re-verified; Driver cannot start stale trip |
| E08 | Chilled readiness and partial load: reefer/order checks enforced, line corrections audited, flag quantities valid, a documented shortfall permits confirmation |
| E09 | Loader network interruption and device lock: ticks/flags survive; reconnection cannot overwrite a changed plan or claim unsent hand-off |
| E10 | Driver safety: detailed actions and conflict resolution inaccessible until safely stopped; optional map unavailable does not prevent core delivery work |
| E11 | Full offline Driver execution: restart phone/browser after recording outcome/proof, retain them, resume remaining stops, reconcile after network recovery |
| E12 | Sync retry/conflict: duplicate batches do not duplicate outcomes; both versions retained; reviewed decision reaches Live Board; proof and record acknowledgement control pending count |
| E13 | Trip end: all visited locally but one unsynced record reproduces U80; acknowledgement enables U79 completion |
| E14 | Store arrival dispute, short/damaged and Tech reservation: counts/evidence saved and case created; no false full receipt |
| E15 | ISS-0417: 44/42/42/42 evidence attributes to loading, creates credit record, notifies Store, does not penalize Driver; one reopen allowed |
| E16 | Replacement resolution: creates a traceable feasible replacement delivery; unverified complaint cannot automatically change a performance score |
| E17 | Online Driver event reflected within 10s; stale/offline state honestly shown; notifications acknowledge and failed channel sends retry |
| E18 | Forecast: operating days, brand/temp volumes, what-if, shortfall recommendations and provenance agree; sample output never mislabeled trained output |
| E19 | Role/depot/outlet/Driver scoping via direct API, session timeout and account switch; cached offline data cannot leak between accounts |
| E20 | All 82 page references visually reconciled; Loader/Driver phone usability and Store phone parity verified; localization, keyboard use and contrast checked |
| E21 | Fresh installation through `docker compose up`, correct seed imports, four judge accounts and complete README walkthrough |
| E22 | Task 1 labels/joins/temporal validation, probability bounds and exact row order; Task 2A requested-week demand including not-run/deferred, chilled rules |
| E23 | Task 2B repeated outlets, whole orders, mixed-window budgets and at-most-two-trips; no return time added; checker plus policy evidence and exact templates |
| E24 | Flooding, peak overload, extended offline and office restart: reasons, persisted plans, safe recovery and explicit unresolved work, no silent data loss |
| E25 | 200-order/60-vehicle benchmark and UI/recheck/chart timings meet R targets; proof retention and backup restore demonstrated |

## 8. Submission and scoring completeness

| Phase | Required deliverables | Judging weights |
|---|---|---|
| Designathon — audit existing submission | Four personas, flows and a paragraph rationale per screen, named fully designed degradation scenario with rationale, high-fidelity prototype, AI disclosure, unlisted 3–5 min video; organized design file, `TeamName_Designathon.zip`, shareable prototype/video links; optional tradeoff page/diagram and style guide | Problem framing 25%; user context 20%; degradation 15%; domain accuracy 10%; scope/prioritization 15%; visual/interaction consistency 15% |
| Hackathon | Live responsive app, four seeded role credentials, named GitHub monorepo, setup/configuration/walkthrough README, root Compose and `.env.example`, architecture/data model/AI disclosure in `docs/`, unlisted 5–8 min video, submission links | Four-role completeness 20%; allocation 20%; degradation/offline/recovery 10%; design fidelity 10%; engineering/architecture 25%; creativity 5%; video 10% |
| Datathon | Architecture/preprocessing rationale, saved models, final notebook with load-and-infer final cell, three exact CSVs, allocation policy, AI disclosure, unlisted 3–5 min video, `TeamName_Datathon.zip` | Wrangling/labels 20%; model implementation 25%; predictive performance 20%; allocation/policy 15%; creativity 10%; video 10% |

All three competition phases contribute equally overall. Missing a phase receives zero for that phase but does not prevent continuing. Audit the existing Designathon artifacts; the NOVA PDF alone does not establish that personas, rationale, interactive prototype and video were submitted. [B3,9–10,12–13,22–23]

Booklet submission links: [Designathon](https://forms.gle/H6dqUZP6pXdGC8Go8), [Hackathon](https://forms.gle/WurHAKjbq2XEZQhbA), [Datathon](https://forms.gle/CcPPmttWdQgHvUdi6). These are transcribed from the supplied booklet; this review did not verify that the forms remain open or access the restricted datasets.

## 9. Definition of finished

The system is finished only when the four portals operate on shared real records; all constraints and failure recovery work; every finalized UI page/state has fidelity evidence; retained R requirements have passing acceptance evidence; missing/conflicting design decisions are resolved explicitly; and required competition artifacts are reproducible. A clickable screenshot reproduction, a working happy path, or an uploaded ZIP alone does not meet this definition.
