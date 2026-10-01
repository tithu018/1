# Waypoint — source conflicts, missing inputs, and implementation decisions

This register protects both **requirements completeness** and **exact NOVA design fidelity**. The PDFs do not agree on every behavior, and some mandatory requirements have no designed interaction. The plan can be complete as a work breakdown without pretending those missing decisions have already been made.

No decision below authorizes a visual redesign. Existing layouts stay fixed. “Proposed treatment” is an implementation recommendation, not a statement that the team has approved changed behavior or copy. Resolve affected items in Phase 0 or before their listed acceptance gate; continue independent work meanwhile.

Source key: B = Challenge Booklet, R = RootCode, U = NOVA; physical PDF page numbers. See [main plan](IMPLEMENTATION_PLAN.md), [UI checklist](UI_SCREEN_CHECKLIST.md), and [requirements matrix](REQUIREMENTS_MATRIX.md).

## D01 — Order changes after 16:00

**Conflict:** R6 SM-FR9 allows edit/cancel only until 16:00. U17/U20/U22/U24 explicitly allow editing/deleting until loading starts, including a 16:06 edit screen. B4 closes new orders for the next day at 16:00 but does not spell out post-cutoff revisions.

**Proposed treatment:** keep new-order cutoff at 16:00 in all cases. To honor the finalized UI, adopt edits/cancellations until loading starts only as an explicitly recorded team-spec revision: changes create immutable revisions, notify Dispatcher, invalidate affected validation/publication readiness and require re-check/re-publication where necessary. The server must serialize an edit racing loading start. If the team retains R's stricter cutoff, U's copy/actions need an explicitly approved correction. Both interpretations cannot be implemented simultaneously as the same rule.

**Blocks:** P3 edit/cancel acceptance and P4/P5 mutation races. Does not block the visual baseline or before-cutoff submission.

## D02 — Driver proof of delivery and delivered counts lack a capture screen

**Gap:** R11 DR06 requires photo, signature or recipient name. R3/R15 require Driver evidence/count comparison. U29/U49 explicitly show a Driver photo/recipient/count. U69/U74 show “Mark delivered” but no proof capture or count confirmation; U72 immediately shows success.

**Proposed treatment:** implement outcome/proof/count persistence and offline storage in P2/P6. Obtain a minimal designed capture state associated with the existing Mark delivered action before completing the feature. Reuse NOVA's approved form/upload/confirmation language while leaving U69/U74 unchanged. The exact additional interaction must be supplied or reviewed; this plan does not silently add a new form.

**Cannot substitute:** auto-copying Loader quantities, a server timestamp, a mock photo, or the later Store receipt as independent Driver evidence.

**Blocks:** real proof capture, fair attribution, offline-proof acceptance and full-system/Hackathon proof-of-delivery completion.

## D03 — Loader identity: shared terminal versus personal sign-in

**Conflict:** R1/R12/R13 specify shared device with no personal/persistent personal login. U5 has email/staff ID and password; U55 says the check is recorded against sign-in; U59 says “by you.” B12 requires seeded credentials for each of four roles.

**Proposed treatment:** retain U5 as authenticated setup/access for a depot-scoped shared terminal account. Audit terminal identity, depot, session and event time; optionally attach shift/operator attribution only if a corresponding approved workflow exists. Do not represent terminal credentials as proof of which individual loaded the goods. Do not grant anonymous warehouse access.

**Blocks:** final identity/audit semantics, not building the sign-in layout. Team must agree shared-terminal session expiry/shift-change behavior.

## D04 — Driver “mobile app” and desktop-only claims versus required responsive web

**Conflict:** U6 calls the Driver workspace a mobile app. U12 says other roles use the desktop web app. B12 requires a responsive web app for all roles, with Driver and Loader assessed on phone screens; R7 requires Store desktop/phone parity.

**Treatment compatible with the competition:** deliver a mobile-first responsive Driver web/PWA experience; Open mobile sign-in opens that web route. Loader and Store remain responsive too. A native app is optional and unnecessary for satisfying the booklet. Keep page composition; any misleading copy correction is a recorded copy decision rather than a wholesale redesign.

**Blocks:** release acceptance if the experience requires a native installation or is desktop-only.

## D05 — Tech single-item requirement versus multi-line catalog

**Conflict:** R5 describes Tech's single-item form. U35 deliberately shows a full catalog with two selected products and three pallets; U37 confirms pallet/crate variants. B describes single items as common, not universal.

**Proposed treatment:** retain U35 exactly as the definitive layout; support a valid one-item order within that form and also the illustrated multi-line order. Treat R's form description as revised by the finalized UI. Preserve declared value, fragility, packing units and handling note.

**Blocks:** agreed Tech behavior scope, not catalog layout development. Do not replace the screen with a newly designed one-item form.

## D06 — Fresh reservation option versus Tech-specific rule

**Conflict:** R6 and U37 describe Accept with reservation as a Tech-specific option, but U26 visibly includes it for Fresh. U34 Style excludes it; U36 Tech includes it.

**Proposed treatment:** preserve the U26 reference in the visual fixture; obtain a behavioral decision on whether Fresh can reserve receipt or the U26 option is an accidental design artifact. Generalize the receipt data model so either decision is implementable. Do not silently hide it or allow it without documenting the conflict.

**Blocks:** final Fresh receipt acceptance and exact live-copy/interaction sign-off.

## D07 — Driver goods issues versus trip-only problem reporting

**Conflict:** R11 DR07 includes missing/damaged/wrong-item/late/other. U71 explicitly restricts reporting to trip problems and says Store reports goods issues; U69/U74 reinforce Store goods confirmation.

**Proposed treatment:** keep U71's provided trip-problem layout. Preserve Driver goods-issue types in the domain and obtain the intended additional stopped-only interaction, or explicitly revise DR07 if the team decides responsibility moved to Store. Do not relabel U71's options arbitrarily or drop the FR without a recorded decision.

**Blocks:** DR07/full issue-reporting completion.

## D08 — Phone/tablet designs missing for Store and Loader

**Gap/conflict:** U16–36 and U54–65 are 1440-wide desktop artboards. R13–14 require a mobile/tablet-first Loader with no wide tables; B12 judges Loader on a phone. Store also requires phone parity.

**Proposed treatment:** reproduce the exact supplied desktop layouts, then derive phone layouts using the same information hierarchy, tokens, illustration, controls and component order. Reflow columns and table content into vertical structures only where required for usability, without dropping fields/actions. Obtain design review of those unprovided responsive states. There is no honest “pixel-exact mobile match” where the PDF has no mobile frame.

**Blocks:** mobile fidelity claim and phone acceptance, not supplied desktop reproduction.

## D09 — Operational scheduling versus Task 2B budgets and example times

**Conflict/risk:** U39/U42/U54 show 02:00 Fresh departures; B21 describes Task 2B's Fresh window as 03:30–08:00. Task 2B explicitly excludes return travel from its formula; an operational timetable must account for return/reload and prevent overlapping use. R/UI apply time budgets in operational planning but do not define all scheduling assumptions.

**Proposed treatment:** separate named operational and Task 2B validation profiles. For Task 2B follow its exact formula/budgets. For operations define allowable depot start times, service/waiting, return distance/time, reload duration and daily limits; honor outlet windows regardless. Never treat the prototype's 02:00 as permission to violate a mandated operating interval. Use the same screen layouts with computed valid live schedules.

**Blocks:** scheduling feasibility certification until the operational policy and required inputs are known.

## D10 — Prototype placeholders and annotations are visible

**Observed:** sign-in checkbox says “Label”; U10 reset input has “Value” and “Helper”; U7 is “Not part of this prototype”; U3 has demo outlet chips; U37 is explanatory design documentation; U82 says night colors are prototype values; phone pages draw OS time/signal/battery. There are no interactive prototype links in the supplied PDF. Extracted text also mangles some punctuation, so rendered appearance is authoritative for transcription.

**Proposed treatment:** classify fixture/prototype documentation versus product UI explicitly. Preserve all references for comparison. The real app must not fabricate phone signal/battery or expose unrestricted demo switching. Obtain copy decisions for placeholders and original prototype link targets; implement required actions instead of routing them to U7. Recover exact text from rendered pages where extraction is malformed. Do not infer “Label” means “Remember me” without confirmation.

**Blocks:** clean product copy and exact final sign-off for affected pages; not rendering their supplied fixture states.

## D11 — Prototype values cannot all be treated as operational truth

**Examples requiring reconciliation:**

- U39 shows 18 vehicles, 21 trips and “2 vehicles run 2 trips”; under a maximum of two, 18 vehicles with two second trips would yield 20 trips, not 21. U42 shows 19 vehicles/22 trips and the same “2 vehicles” text, which would yield 21.
- U42 still says all 38 chilled orders are on reefer vehicles after one chilled order is deferred. Confirm denominator and actual source records rather than copying the metric.
- U66 presents 216 units, while U58/U59 say 215 of 216 loaded. Planned quantity is valid if labeled/understood as planned, not as physical loaded count.
- U67/U76 show OUT008 delivered 04:36 although U66 gives its receiving window as 05:00–07:30. U25 shows a delivered time of 04:44 for a 05:00-opening order. B15 says early arrivals wait until opening. Arrived and completed cannot be conflated.
- U45 describes the breakdown before loading starts; U62 shows three stops already loaded. These must be separate scenario states or their timeline must be reconciled.
- U51's “Delivered on” column includes future rescheduled dates, which must not be confused with confirmed actual receipt.
- U23 says both rolled-over orders arrive the next day; live messaging cannot promise this before a valid plan is published.

**Proposed treatment:** preserve illustrative snapshots in an isolated fidelity fixture. For live/judge workflow compute all counts/times from coherent records; reconcile any displayed semantic labels with design owner. Do not seed an invalid chronology and call it a validated operational day. Compare fixture geometry separately from live correctness.

**Blocks:** exact scenario data acceptance, not screen composition.

## D12 — Competition seed/deployment requirement versus data confidentiality

**Conflict in packaging responsibilities:** B12 requires shared data seeded by `docker compose up`, a source repository and public deployment; B22 restricts data use/sharing/public disclosure, including derivatives, without authorization. The repository is required on GitHub, but the booklet excerpt does not require that repository to be publicly readable.

**Proposed treatment:** use authorized competition access and private team/judge distribution for restricted data; keep public-facing entry separate from role-protected data. Agree an organizer-compatible seeded package/private artifact mechanism that still gives judges complete startup with no hidden manual setup. Do not publish raw datasets, extracted derivatives, model training records or evidence in a public repository to solve seeding convenience. Record the interpretation/authorization governing deployment and artifact access.

**Blocks:** data distribution/public-release packaging, not local modeling/schema/design work. This planning task did not download, share or publish the dataset.

## D13 — Missing authoritative inputs and assets

**Not present in workspace:** CSV datasets, submission templates, checker, original interactive design file, source fonts, original component/sample-catalog page referenced by U37, deployment details and the individual Dispatcher requirements.

**Available:** all three PDFs; local rendered references and extracted text; embedded PDF illustrations/vector shapes; dataset folder hyperlink transcribed from B7/B31.

**Proposed treatment:** import the data from the team's authorized source and audit exact schemas. Extract usable original artwork from the PDF without regenerating it. Obtain original font/assets/interactive file where extraction cannot reproduce the design. Keep framework choices unpinned until team/stack context is known. The 105 FR/23 NFR count is a document claim, not evidence that those individual statements were reviewed.

**Blocks:** actual seed/model training/checker validation, exact typography and complete individual Dispatcher traceability. Does not block the supplied-scope phase plan.

## D14 — Requirements without completed interaction designs

**Affected scope:** missing-order reminders; knowledge/gate-code contribution; receiving-hour requests; feedback/Driver score; critical-need signalling; brand fairness; stop-level prediction display; bulk defer/supervisor exception; shift handover/trip locks; explicit Driver pause/resume; stopped route-update review; Loader filters/sort; Store outlet-change form; reference Outlets/Calendar tab contents; successful trip-end acknowledgement; empty/loading/error states.

**Proposed treatment:** keep each requirement in the matrix and implement the required domain/service behavior. Reuse existing NOVA cards/dialogs/notifications for new states only after the interaction is specified/reviewed. Do not add an unrequested new navigation architecture. No undisclosed new page can be called “exactly as shown in NOVA.”

**Blocks:** the corresponding feature's completion; independent existing screens remain actionable. ADD07 is the only addition explicitly labelled potentially cuttable in R, and still requires an explicit scope decision.

## D15 — Localization and accessibility can expose design gaps

**Gap:** R mandates three languages, a per-account language selector, contrast ≥4.5:1 and keyboard operation. Most U screens show only English; Store settings do not show a locale control; driver sign-in does not reproduce the desktop locale selector. Long Sinhala/Tamil strings and font glyph coverage cannot be inferred from English artboards.

**Proposed treatment:** build translation keys and semantic controls now. Measure contrast and text layout; obtain matching supported fonts. Specify locale-selection placement using existing approved patterns. If a source color/size fails a requirement, log the exact conflict and seek a targeted correction; do not independently change the palette. Reflow for text growth without hiding essential content.

**Blocks:** three-language/accessibility acceptance and any claim that visual fidelity alone satisfies R NFRs.

## D16 — Reefer readiness threshold is unspecified

**Gap:** U60 requires a Celsius reading and “Reefer is at temperature,” but the PDFs provide no permitted temperature range, commodity-specific threshold, source of measured reading or exception policy. B mentions chilled/frozen goods, while dataset temperature categories are chilled/ambient.

**Proposed treatment:** require the recorded reading and explicit readiness acknowledgement as designed; make acceptable range a versioned operational configuration once specified. Treat frozen as requiring refrigeration at minimum, but do not infer distinct temperature capability from the given binary data. Do not invent or claim a validated cold-chain threshold.

**Blocks:** physical temperature validation policy, not the illustrated field/check or refrigerated-vehicle compatibility.

## D17 — Cutoff boundary, operating-date rules and historical demo clock

**Gap:** PDFs say “before 16:00” and “after 16:00,” without a precise equality rule. U dates are March 2026; competition deadlines are September/October. A live countdown cannot remain tied to the screenshot date.

**Proposed treatment:** specify `[opening, 16:00)` for the relevant queue: server acceptance at exactly 16:00 is closed, and new demand belongs to the next eligible run. Use `calendar.is_operating` together with the stated operating schedule, flagging any inconsistency rather than guessing a holiday policy. Isolate a simulation clock for repeatable screenshots/judge scenarios; never change real deadline or live order timing. Define which scheduled Style/Tech day is selected when a submission is late.

**Blocks:** boundary and rescheduling tests until semantics are fixed. Proposed treatment should be recorded as policy before implementation.

## D18 — Forecast conversion, unusual-order baseline and score formulas

**Gap:** U52 uses sample reefer trips and a +1 truck recommendation; Task 2A predicts only volume. The tonnage tab has no required Task 2A output. R mentions Driver scoring/service fairness without formulas. U38 flags 1.6× unusual volume without a general threshold/baseline definition.

**Proposed treatment:** define versioned, explainable policies for volume-to-trips, weight/tonnage estimate, usable trips per day, utilization, workshop adjustments, extra Driver count, fairness denominator and verified-case scoring. Define an outlet/brand/history baseline for unusual quantities, with missing-history behavior. Keep U52's labels/layout and sample disclosure until computed data is ready. Extra vehicles/drivers are capacity planning outputs, not a new driver-availability constraint on the existing fleet.

**Blocks:** calibrated operational forecasts, scoring and anomaly decisions; no need to block Task 2A CSV completion on trip conversion.

## D19 — Read-only master data versus Store change requests and management

**Tension:** U53 says identifiers and limits are read-only and only vehicle workshop status can change. R covers reference management and Store receiving-window/access/knowledge changes; U31 offers Request a change.

**Proposed treatment:** master IDs/capacity remain read-only in the Dispatcher UI. Store sends an auditable request; approved effective-dated operational overrides/notes become inputs to feasibility without altering supplied competition master IDs. Define who can approve and how the approved change is displayed. Existing reference-data tabs can show both baseline and approved operational context if designed; avoid an invented unrestricted admin portal.

**Blocks:** full change-request lifecycle and future-plan revalidation semantics.

## D20 — “Driver receives the plan” versus “trip visible after loading”

**Tension:** U43 says Drivers get assigned stops at publication; U59 says the Driver can now see the trip after load confirmation. R13 FR7 describes loading hand-off making the trip visible to Driver.

**Proposed treatment:** record assignment at publish and notify the Driver, but gate executable/ready trip access or Start trip until valid current-version loading confirmation. Choose whether a not-ready preview is visible; such a preview has no complete U frame. Never allow early departure because an assignment event arrived.

**Blocks:** precise pre-load Driver UI state, not assignment storage or readiness enforcement.

## D21 — Offline completion and conflict authority

**Tension:** R demands full offline core work; U80 explicitly blocks End trip until sync. U77 recommends keeping the phone's delivery against server “Driver offline—status unknown”; that server annotation need not be a competing physical outcome. R requires conflict review, not timestamp-only last-write-wins.

**Proposed treatment:** allow all stop work and local “all stops visited” while offline; require acknowledgement for server finalization exactly as U80 shows. Model connectivity separately from delivery outcomes. Surface genuine version conflicts and reproduce the U77 review case without teaching the backend to erase deliveries based only on stale connectivity. Record local/server times and causal sequence; do not trust device clock alone. Define Driver resolution authority versus Dispatcher escalation for substantive contradictory outcomes.

**Blocks:** reconciliation/finalization acceptance until policy is explicit; local record storage can proceed.

## D22 — Navigation and sunset require inputs not supplied by the data reference

**Gap:** U68's map is labeled illustrative. B's outlet schema lists district/access/windows, not coordinates or road geometry. U81 says switch automatically after sunset, but no location policy or sunset source is specified.

**Proposed treatment:** preserve the designed map as a disclosed fixture and make navigation optional; if live navigation is retained, obtain coordinates/routing source and style it to match rather than replacing the interface with an unrelated map. Compute sunset from an agreed depot/location/date source or document the chosen policy; a fixed arbitrary hour is not accurately “after sunset.” Do not add continuous tracking as an implicit requirement.

**Blocks:** real navigation and automatic sunset claims, not core route execution or manual night mode.

## D23 — Prototype catalog, evidence and financial outcomes need provenance

**Gap:** U37 calls products/prices sample data and says baskets match actual order totals. Shared datasets have order totals, not a documented product catalog, inventory, proof photos or accounting ledger. U49 resolves credit or same-day replacement but does not specify financial-system integration.

**Proposed treatment:** seed a versioned sample catalog consistent with the PDF, including all visible product codes and packaging. Validate calculated basket totals against order totals; record unavoidable rounding/sample assumptions. Create real app-captured proof during the live walkthrough and label seeded historical evidence as demonstration fixtures. Implement an internal auditable credit/replacement record; external payments/ERP integration is not specified and should not be invented.

**Blocks:** exact order-fixture reconciliation and resolution side-effect completeness until modeling choices are explicit.

## D24 — Historical deferral reasons and consecutive skips

**Gap:** U51 acknowledges pre-25-Mar reasons are sample text because the dataset stores deferral status but not reasons. An outlet may receive dry goods while its chilled order is deferred; treating “outlet served” as one boolean would hide the repeated chilled failures highlighted in U16/U23/U38.

**Proposed treatment:** preserve imported status facts, distinguish unknown versus sample historical reason, and require real reasons for every new app deferral. Track order history and relevant service stream/temperature context as well as outlet-level service health; define “consecutive” in eligible operating runs rather than naive calendar days. Maintain priority across rollover without duplicating original demand.

**Blocks:** fairness/deferral statistics acceptance if aggregation semantics remain undefined.

## D25 — Deadline feasibility and unseen existing work

**Known:** only PDFs exist in this workspace; the user has not supplied team size, already-built code elsewhere, or exact Designathon submission status. As of 1 October 2026, Hackathon is due 4 October and Datathon 9 October, 23:59 Sri Lanka time.

**Proposed treatment:** use the main plan's deadline schedule as a target, validate available staffing/current work immediately, and measure progress against phase gates. Do not promise that a complete secure, offline, multilingual 82-page system plus all models can be built in the remaining period without that information. A competition release and full R-scope completion may differ; show unresolved rows honestly and seek an explicit scope decision if needed rather than missing requirements silently.

**Blocks:** a defensible duration/effort commitment, not the ordered implementation plan.

## Decisions that can be made without altering the finalized UI

- Keep Waypoint product identity and one shared brand-aware system.
- Use stable internal enums and map the source wording aliases consistently.
- Store immutable plan/order/load snapshots and append-only audit corrections.
- Use server-received time for new-order cutoff; keep device time as evidence, not authority over queue eligibility.
- Make every mutation and sync operation idempotent; use version checks for concurrent planning/loading.
- Persist Driver records/proof locally before confirming local save; clear pending only after server acknowledgement.
- Separate operational allocation and exact Datathon export rules.
- Do not split one order, mistake repeated outlets for duplicate orders, or invent separate existing-driver availability limits.
- Keep model forecasts, sample output and operational conversion assumptions distinguishable.
- Avoid adding inbound receiving, generic inventory procurement, a new public signup flow, a native-only app, an unrestricted admin portal, external ERP/payment integration or continuous GPS tracking: none is specified as a required new system area.

## Closure record template

For each decision record: ID; chosen interpretation; owner; date; source/authority; any exact copy or new-state design approved; affected FRs/pages; backend policy; acceptance test; and whether README disclosure is needed. A resolved decision does not waive booklet rules. A documented deviation also does not count as user approval to redesign.
