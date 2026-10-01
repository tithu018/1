# Waypoint — requirements traceability and acceptance matrix

This matrix maps the requirements actually present in the three PDFs to [implementation phases](IMPLEMENTATION_PLAN.md). It is a planning baseline: **all rows are pending implementation and verification**. `E01` etc. refer to the acceptance scenarios in the main plan. Source page references are physical PDF pages; `U` denotes NOVA pages.

Store and Loader both use FR1/NFR1 numbering in RootCode; prefixes below disambiguate them. Dispatcher area IDs and unnumbered NFR/addition IDs are local traceability labels, not invented original requirement numbers. The separately referenced 105/23 Dispatcher requirement lists were not supplied.

## System-wide functional requirements — R pp.2–4

| ID | Requirement | Phase | Acceptance evidence |
|---|---|---|---|
| OFR1 | All confirmed Store orders enter one Dispatcher queue without re-entry | P2–P4 | E01: Store server confirmation links to same order in U38 |
| OFR2 | Shared order statuses and issue lifecycle across roles | P2, P3–P7 | Canonical enums and label mapping; U20/U21/U29/U49/U65; no divergence between Driver delivery and Store receipt |
| OFR3 | One adaptive portal per role; brand/temp conditional content, no brand-forked apps | P1–P3, P5–P7 | E01/E20; registered outlet controls U17/U33/U35 |
| OFR4 | Automatic confirmations, reasons, ETA changes, load flags, outcomes and issue updates; in-app plus time-critical SMS/push | P2–P8 | E08/E15/E17; reliable event outbox, actual channel attempts and acknowledgement |
| OFR5 | Tracked evidence-backed issues; three-stage counts; verified responsible-stage-only performance impact | P2, P5–P7 | E15/E16; proof gap D02 resolved; no automatic blame for missing evidence |
| OFR6 | Mandatory deferral reason, consecutive-skip flags and next-run priority-preserving rollover | P3/P4/P8 | E06; U23/U41/U51 and audit history |
| OFR7 | Same festival/payday/monsoon/holiday data informs ordering, forecast and capacity | P2/P3/P8/P12 | E03/E18; one calendar source |
| OFR8 | Exact shared outlet/vehicle/order/route identifiers in all views | P2–P13 | Import validation, IDs in UI/API/exports; no outlet-only join |
| OFR9 | End-to-end timestamped audit of orders, allocations, deferrals, loading, delivery and issues | P2–P7 | E07/E12/E15; append-only correction history |

## System-wide non-functional requirements — R pp.4–5

| Local ID | Requirement | Phase | Acceptance evidence |
|---|---|---|---|
| SYS-N01 | Consistent terms/status colors/icons across all four roles | P1/P2/P9 | Shared status tokens and U page comparisons |
| SYS-N02 | Text contrast ≥4.5:1; color plus icon plus text | P1/P9 | Measured contrast, keyboard/screen-reader review, exception log if exact PDF conflicts |
| SYS-N03 | Sinhala/Tamil/English, per-account selection, Asia/Colombo 24h, date style “Wed 30 Sep” | P1/P2/P9 | Three-locale layout and notification checks, server cutoff timezone tests |
| SYS-N04 | Immutable audit, append corrections rather than in-place history editing | P2/P9 | Database permissions plus correction/cancellation/version tests |
| SYS-N05 | Outlet/depot/assignment scope; explicit cross-depot grants only | P2/P9 | E19 direct API and subscription access tests |
| SYS-N06 | Driver core full offline; Store local drafts; Loader checklist recovery; Dispatcher server persistence | P2/P3/P5/P6/P9 | E02/E09/E11/E24 |
| SYS-N07 | Every submission clear ID/success or actionable retry; no silent acceptance/loss | P2–P7/P9 | Lost-response and local-storage failure tests |
| SYS-N08 | Context-specific usability: Store simple, Loader touch, Driver safety, Dispatcher keyboard/dense | P1/P3–P6/P9 | E10/E20 role-specific review |
| SYS-N09 | 200 orders/60 vehicles ≤30s, online board event ≤10s, filters/transitions ≤1s | P4/P8/P9 | E25 measured benchmark with conditions |
| SYS-N10 | Replaceable allocation API, configurable deferral policy, third depot without structural changes | P2/P4/P14 | Provider-contract test, rule config versioning, third-depot seed demonstration |

## Store Manager functional requirements — R pp.5–7

| ID | Priority in R | Requirement | Phase | UI / evidence |
|---|---|---|---|---|
| SM-FR1 | Must | Brand-aware before-cutoff order; Fresh dry/chilled, Style weekly, Tech value/fragility/single-item capability | P3 | U17/U33/U35; E01; multi-line UI conflict D05 |
| SM-FR2 | Must | Persistent cutoff countdown; after 16:00 new order clearly goes to next run | P3 | U16–19; E02; D01/D17 |
| SM-FR3 | Must | Immediate order ID/time and progressive Submitted→Received/Confirmed→Allocated→Out for delivery→Delivered/Deferred | P2/P3 | U18/U20/U21; real acknowledged state |
| SM-FR4 | Must | Planned arrival and delivery window after publication | P3/P4 | U16/U21; no false precision |
| SM-FR5 | Must | Proactive reason/new-date deferral notice and consecutive-skip warning | P3/P4 | U23/U30; E06 |
| SM-FR6 | Must | Full/short/damaged receipt; Tech reservation pending inspection | P7 | U25–27/U34/U36; E14; Fresh option conflict D06 |
| SM-FR7 | Must | Issue affected lines, type, quantity, optional note/photo; tracked case | P7 | U26/U27/U36; E14/E15 |
| SM-FR8 | Must | Outlet order/delivery history with consecutive deferrals highlighted | P3/P7 | U28; E06 |
| SM-FR9 | Should | Edit/cancel submitted order until 16:00 | P3 | U20/U22/U24 instead say until loading; unresolved D01 |
| SM-FR10 | Should | Store closure/access change, mall event/roadworks/bay closure | P3/P4 | U31; request-change/approval state missing, D14 |
| SM-FR11 | Should | Plain-language live delivery status after departure | P3/P6/P8 | U20/U21; E17 |
| SM-FR12 | Must | Resolution outcome replacement/credit/not upheld with reason; confirm or reopen once | P7 | U29/U49/U50; E15/E16 |
| SM-FR13 | Should | Expected-shortfall notice before arrival | P3/P5/P7 | U16/U21/U26/U30; E08 |
| SM-FR14 | Must | Unified acknowledgeable notifications centre | P3/P7 | U30; E17 |

## Store Manager non-functional requirements — R p.7

| ID | Requirement | Phase | Acceptance evidence |
|---|---|---|---|
| SM-NFR1 | Zero training, plain language, short forms, no fleet jargon | P1/P3/P7/P9 | Task walkthrough from a fresh account; U16–36 fidelity |
| SM-NFR2 | Equal desktop/phone usability | P1/P9 | Phone derived-layout review D08 and E20 |
| SM-NFR3 | Proactive in-app plus SMS/push for deferrals, ETA and shortfall | P2/P7 | E17 including channel failure/retry |
| SM-NFR4 | No silent order failure near cutoff | P3/P9 | E02/U19 |
| SM-NFR5 | Status color/icon/text; contrast ≥4.5:1 | P1/P9 | E20 |
| SM-NFR6 | Status naming/colors/icons match other roles | P1/P2/P9 | Shared component audit |
| SM-NFR7 | Timestamped immutable order/edit/receipt/issue history | P2/P3/P7 | Revisions append snapshots/events; no erased originals |
| SM-NFR8 | Outlet-only access, no other outlets/fleet capacity/planning tools | P2/P9 | E19; only allowed assigned delivery facts shown |
| SM-NFR9 | Brand conditional on outlet, not separate applications | P1/P3 | U37 and three seeded brand accounts |
| SM-NFR10 | Planned time plus window, never false precision | P3/P4/P8 | ETA provenance/staleness and plan publication tests |
| SM-NFR11 | Weak-connectivity drafts retained locally | P3/P9 | U19, E02 restart test |
| SM-NFR12 | Sinhala/Tamil/English; Colombo 24h | P1/P2/P9 | Locale choice gap D15; E20 |

## Dispatcher functional areas — R pp.8–9

| Local ID | Source area | Full supplied scope | Phase | UI / evidence |
|---|---|---|---|---|
| DSP-A01 | App frame/navigation | Plan/Live Board/Deferral Log/Capacity Forecast; depot/date context; operating-day selection only | P1/P2/P4 | U38–53; E03 |
| DSP-A02 | Intake/queue | All confirmed orders; 16:00 cutoff; late-to-next-run; unusual quantity flags | P3/P4 | U38/U48; E01/E02 |
| DSP-A03 | Planning/allocation | Every in-scope order vehicle/trip decision; assisted default; explain suggestions; manual rechecks | P4 | U39–42; E04/E05 |
| DSP-A04 | Constraints | Weight, volume, temp, van-only, mall/window, fuel, depot/brand/district, whole order; publish block | P4 | U39/U42; full E04 battery |
| DSP-A05 | Shortfalls/deferrals | Capacity shortfall, mandatory reasons, consecutive-skip protection | P4 | U41/U51; E06 |
| DSP-A06 | Publish/hand-off | Publish to roles; versioned re-publication; hard-failure blocking | P4/P5 | U43–46; E05/E07 |
| DSP-A07 | Live board | Real-time per-route progress, sync, planned vs actual, non-color-only legend | P6/P8 | U47; E17 |
| DSP-A08 | Issues/alerts | Unified needs-attention feed; distinct critical breakdown/vehicle-loss alerts; resolution note required | P4/P7/P8 | U45/U48–50; E07/E15 |
| DSP-A09 | Communication | Automatically send/log ETA, deferral and shortfall instructions in system | P2/P4/P7 | U30/U32; E17 |
| DSP-A10 | Deferral log/history | Search/export reason and outcome; consecutive-deferral highlight | P4/P8 | U51; E06 |
| DSP-A11 | Capacity forecast | Weekly depot/brand demand vs fleet; calendar markers; shortfall/recommended vehicles | P8/P12 | U52; E18 |
| DSP-A12 | Reference data | 120 outlets, 60 vehicles, operating calendar, governing attributes/workshop state within scope | P2/P4 | U53; E19; cross-depot grant needed for complete network view |
| DSP-A13 | Offline reconciliation | Safe incoming Driver records; conflicts surfaced without overwrite | P2/P6 | U47/U76–78; E12 |
| DSP-A14 | Audit/disputes | Immutable trail and loader/driver/store delivered-order counts | P2/P7 | U49; E15/E16 |
| DSP-A15 | Shift continuity (Should) | Handover notes and multi-dispatcher trip locking | P2/P4/P14 | Version/lock collision tests; missing UI D14 |
| DSP-A16 | Degradation | Peak overload with priority/swap/bulk defer, breakdown, workshop loss, flooding, prolonged offline, office power loss | P4/P5/P6/P9 | U39–46/U61–64/U73–80; E24; bulk UI missing D14 |

## Dispatcher non-functional categories — R pp.9–10

| Local ID | Requirement | Phase | Acceptance evidence |
|---|---|---|---|
| DSP-N01 | Full plan ≤30s; override ≤3s; live ≤10s; UI ≤1s; forecast ≤5s | P4/P8/P9 | E25, measured independently |
| DSP-N02 | Save every plan server-side; device-time offline merge/conflict flagging; immutable audit; proof ≥90 days | P2/P4/P6/P9 | E11/E12/E24, retention config and restore test |
| DSP-N03 | Desktop dense/no horizontal page scroll; contrast/keyboard/shortcuts; one-line decision explanations; explicit empty/loading | P1/P4/P9 | E20; missing-state inventory completed |
| DSP-N04 | Shared terminology/IDs/colors/icons and exact dataset identifiers | P1/P2/P9 | Shared enums and fixture-to-source checks |
| DSP-N05 | Authenticated Dispatcher only for plan/publish/defer/vehicle status; depot default; inactivity timeout | P2/P4/P9 | E19 and publish direct-API tests |
| DSP-N06 | Three languages and recipient-preferred outgoing language | P1/P2/P7/P9 | Three-locale message/render tests |
| DSP-N07 | Replaceable allocation, editable priority configuration, third depot without structural change | P2/P4/P14 | Configuration provenance, API replacement and third-depot trial |

## Driver functional requirements — R pp.10–11

| ID | Priority in R | Requirement | Phase | UI / evidence |
|---|---|---|---|---|
| DR01 | Must | View assigned trip/stops | P6 | U66; own-trip scope |
| DR02 | Must | Explicitly start selected trip | P6 | U66; active state audited, load gate enforced |
| DR03 | Must | Minimal driving mode | P6 | U67/U73/U82; E10 |
| DR04 | Must | Next stop, planned/ETA and window | P6 | U67/U69; early-wait logic |
| DR05 | Must | Each stop's outcome | P6 | U69/U70/U72/U74/U75; delivered/failed distinguishable |
| DR06 | Must | Proof: photo, signature or recipient name | P2/P6 | D02 mandatory missing capture interaction; persisted actual proof, E11/E15 |
| DR07 | Must | Missing/damaged/wrong-item/late/other delivery issues | P6/P7 | U71 is trip-only; D07 unresolved; backend must retain required types |
| DR08 | Must | Core delivery work offline | P6 | U73–75; E11 |
| DR09 | Must | Automatic reconnect sync, conflicts flagged | P6 | U76–78; E12 |
| DR10 | Should | Sync status and failed-sync retry | P6 | Sync tab; retry/error state supplement needed |
| DR11 | Should | Pause/resume active trip without ending | P6/P14 | Active trip state retained; unprovided explicit pause UI D14 |
| DR12 | Should | Receive route/stop changes, review only safely stopped | P4/P6 | Versioned updates and stopped review; E07/E10 |
| DR13 | Should | Completed/remaining progress | P6 | U66/U67/U73/U79 |
| DR14 | Should | End trip with final status | P6 | U79/U80; E13 |

## Driver non-functional categories — R pp.11–12

| Local ID | Requirement | Phase | Acceptance evidence |
|---|---|---|---|
| DR-N01 | Simple low-step glanceable interactions | P1/P6/P9 | U67/U69 phone walkthrough |
| DR-N02 | Detailed actions only after safely stopped | P6/P9 | E10 including sync review, updates and settings behavior |
| DR-N03 | Fast opening current stop and recording outcome | P6/P9 | Local-read/local-write and online timing evidence; no blocking proof upload |
| DR-N04 | Offline records/proof never silently lost | P2/P6/P9 | E11 interrupted upload, restart, storage failure tests |
| DR-N05 | Core execution fully available with zero network | P6/P9 | Network disabled after pre-trip cache; E11 |
| DR-N06 | Outcome/proof/issue/timestamp linked to correct delivery | P2/P6 | Referential integrity, operation IDs and repeated-outlet test |
| DR-N07 | Own trip/delivery/account only | P2/P9 | E19 and account-switch cache protection |
| DR-N08 | Phone-first highly visible stop/ETA/window/status/sync | P1/P6/P9 | U66–82, E20 |
| DR-N09 | Shared status terms and states | P1/P2/P6 | Shared enum/component checks; offline status separate from physical outcome |

## Loader functional requirements — R pp.12–13

| ID | Priority in R | Requirement | Phase | UI / evidence |
|---|---|---|---|---|
| LD-FR1 | Must | Depot's daily trips, Fresh urgency distinct | P5 | U54; scoped full queue |
| LD-FR2 | Must | Stop sequence/reverse loading for last-in-first-out | P5 | U55/U56/U60; E08 |
| LD-FR3 | Must | Per-stop outlet/brand/weight/volume/temp/dock | P5 | U55/U56/U60 data completeness |
| LD-FR4 | Must | Confirm physical loading per order/item | P5 | U56; actual count snapshot |
| LD-FR5 | Must | Missing/damaged flag, optional note/photo, near-real-time Dispatcher | P5 | U57; E08/E17 |
| LD-FR6 | Must | Live published-plan updates | P4/P5 | U54/U62; E07 |
| LD-FR7 | Must | Confirm loaded trip; Driver hand-off | P5/P6 | U58/U59/U66; current-version readiness |
| LD-FR8 | Must | Finish documented partial load despite flags | P5 | U58/U59; no unexplained unchecked lines |
| LD-FR9 | Could | Distinguish Trip 1 and 2 | P5 | Already visible U54–60; include in full scope |
| LD-FR10 | Must | Undo mistapped tick/withdraw flag until confirmation | P5 | Checklist correction/flag withdrawal audit tests |
| LD-FR11 | Must | Filter/sort queue by urgency, vehicle, status | P5 | U54 derived controls follow D14; test each operation |
| LD-FR12 | Must | Alert/reopen/re-verify changes after loaded confirmation | P4/P5 | U62–64 and post-confirmation variant E07, not only pre-load breakdown |

## Loader non-functional requirements — R pp.13–14

| ID | Requirement | Phase | Acceptance evidence |
|---|---|---|---|
| LD-NFR1 | Shared device/no persistent personal login; large targets/minimal typing | P1/P2/P5 | D03 identity resolution; E20 |
| LD-NFR2 | Few-tap speed for Fresh morning work | P1/P5/P9 | One-handed loading test |
| LD-NFR3 | Near-real-time plan sync, no unnoticed stale plan | P2/P4/P5 | E07, stale-version confirmation rejection |
| LD-NFR4 | High contrast, large text/icons, warehouse legibility | P1/P9 | Contrast/phone/tablet review; no dense replacement UI |
| LD-NFR5 | Reliable flag action with visible confirmation/no silent failure | P5/P9 | Duplicate/lost response and offline flag tests |
| LD-NFR6 | Timestamped confirmation/flag/correction | P2/P5 | Append-only load history |
| LD-NFR7 | Checklist survives terminal lock/shift change | P5/P9 | E09 with authorized device continuity |
| LD-NFR8 | Cross-role colors/icons/status language | P1/P2/P5 | Shared tokens and U page review |
| LD-NFR9 | Tablet/mobile vertical/thumb-accessible, no wide desktop tables | P1/P5/P9 | D08 conflict: PDF shows desktop tables; derived phone layout required |
| LD-NFR10 | Brief network interruptions do not lose checklist | P5/P9 | U61, E09 |
| LD-NFR11 | Terminal exposes only own depot trips, no Dispatcher/other depot tools | P2/P9 | E19 |
| LD-NFR12 | Every status has text or icon as well as color | P1/P9 | Consistent stricter system rule: color + icon + text |

## Team-proposed cross-role additions — R pp.14–15

These are retained, including items without a completed U screen. R identifies only the critical-need signal as lowest priority and potentially removable; this plan does not silently cut it.

| Local ID | Addition | Phase | Acceptance / design dependency |
|---|---|---|---|
| ADD01 | Issue cases and fair attribution/accountability | P7 | U29/U49/U50; E15/E16 |
| ADD02 | Missing-order reminder before cutoff | P3/P7 | Schedule by outlet/brand/order rhythm; no reminder for fulfilled/rolled-over need; notification pattern reuse |
| ADD03 | Calendar-aware ordering advice | P3/P8 | U16/U17 and shared calendar E03 |
| ADD04 | Store service feedback into Driver points and Dispatcher reports | P7/P14 | Scoring formula and UI missing D14/D18; verified stage-only effects |
| ADD05 | Outlet knowledge: gate codes/unloading notes to Driver and Dispatcher | P3/P4/P6 | Scoped effective-dated notes; request/edit/display states need review |
| ADD06 | Receiving hours/window management | P3/P4 | Request/approval versus read-only master D14/D19; approved change triggers revalidation |
| ADD07 | Critical-need signal, lowest priority/may be cut | P3/P4/P14 | Nonbinding priority input; no bypass of feasibility; explicit scope decision if excluded |
| ADD08 | Swap suggestions and knock-on-effect preview | P4 | U40/U45/U46; affected stops/windows/vehicles/load states shown |
| ADD09 | Predicted service time/lateness per stop | P8/P11 | Replaceable model contract; missing visible placement D14 |
| ADD10 | Brand service-share fairness summary | P4/P8 | Defined numerator/denominator/timeframe; metrics not misleading count-only proxy |
| ADD11 | Capacity what-if tool | P8/P12 | U52 calculated added vehicle scenario; assumptions visible |
| ADD12 | Partial loads/documented shortfall | P5–P7 | U57–59/U69/U26; all three stages see correct count |
| ADD13 | Post-confirmation change alert | P4/P5 | Invalidate old load readiness, re-verify; E07 race test |
| ADD14 | Pause/resume active trip | P6/P14 | DR11, no destructive trip end |

## UI-specific capabilities beyond the enumerated R requirements

| ID | Capability / detail | Phase | Evidence |
|---|---|---|---|
| UI-X01 | Public landing, roles, split role sign-ins, mobile entry and password-reset flows | P1/P2 | U01–15 |
| UI-X02 | Search, catalog categories, favorites, repeat last order, quantity steppers and saved basket | P3 | U17/U22/U33/U35 |
| UI-X03 | Detailed sample product packaging and declared values | P2/P3 | U17/U33/U35/U37; catalog provenance and totals |
| UI-X04 | Separate physical-arrival acknowledgement before product receipt | P7 | U25 then U26; non-arrival path |
| UI-X05 | Supervisor note exception for protected outlet deferral | P4 | U39; authorized grant and audit, no new role portal required |
| UI-X06 | Reefer temperature reading plus reverse-load-order acknowledgement | P5 | U55/U60; threshold gap D16 |
| UI-X07 | Before/after vehicle transfer with moved versus not-yet-loaded stops | P4/P5 | U62–64 |
| UI-X08 | Explicit local/server sync choice with both versions retained | P6 | U76–78 |
| UI-X09 | End trip disabled until every delivery record reaches server | P6 | U79/U80 |
| UI-X10 | Optional illustrative navigation | P6 | U68; no claim of a routing integration from a static map |
| UI-X11 | Driver display preference, automatic sunset toggle and exact night preview | P6 | U81/U82; sunset source defined |
| UI-X12 | Actual credit/replacement resolution and Store one-reopen process | P7 | U29/U49/U50 |
| UI-X13 | Workshop state editable while master IDs/limits read-only | P4 | U53 and D19 |
| UI-X14 | Forecast trip/tonnage tabs and calendar-aware vehicle what-if | P8/P12 | U52; conversions separately validated |
| UI-X15 | 82 page/state fidelity, including helper pages and all alternate/error states | P1/P9 | Complete UI checklist, no missing page numbers |

## Competition and data requirements

| ID | Source | Requirement | Phase / evidence |
|---|---|---|---|
| B01 | B3–7 | Two depots, 120 outlets/80 Fresh/25 Style/15 Tech, exact shared IDs/calendar | P2 import checks; no substitute master data |
| B02 | B3/5 | 60 vehicles: 12 reefer trucks, 40 dry trucks, 8 vans including 4 reefers; home depot; one driver each | P2/P4 import and assignment checks; 16 chilled-capable vehicles |
| B03 | B4/5 | Separate Fresh dry/chilled orders; Style weekly; Tech as-needed; next-day cutoff 16:00 | P3/P4, E01/E02 |
| B04 | B5 | Both capacities, refrigeration, weekly fuel, ≤2 trips, operating calendar/Mon–Sat, access/windows/docks | P4, E03/E04; future-capacity staffing separate from existing-driver allocation |
| B05 | B4/7 | Connected order/plan/load/delivery/receipt, tracking, feedback, forecasting and prediction | P3–P8/P11/P12, complete four-role E01–E18 |
| B06 | B5/6 | Field work offline and reconciled; phone-safe Driver; shared Loader terminal | P5/P6, E09–E13 |
| B07 | B3/10/12 | Hackathon follows Designathon; significant departures documented; phases equally weighted; missed phase zero but can continue | P0/P1/P9/P10 artifact audit |
| B08 | B9/10 | Four personas; flows and per-screen rationale; named degradation with rationale; high-fidelity prototype; AI disclosure; optional tradeoff/style guide | P0 audit existing Designathon package; U alone insufficient evidence |
| B09 | B9/10 | 3–5 min unlisted design demo, shareable links, `TeamName_Designathon` export/ZIP; 29 Sep 23:59 deadline | P0 submission audit; do not assume submission occurred |
| B10 | B12 | Responsive web required, all roles, Loader/Driver assessed phone-sized; native optional | P1/P5/P6/P9; E20 |
| B11 | B12 | Allocation handles excess demand feasibly with served/deferred decisions; automatic/assisted/manual validation allowed | P4; team chooses assisted default per R |
| B12 | B12 | Public URL, four seeded accounts; seed shared data plus realistic day and numbered walkthrough | P2/P10, E21 |
| B13 | B12 | GitHub monorepo `TeamName_SolutionName`, setup/config/accounts/walkthrough/departures README | P10 clean-clone check |
| B14 | B12 | Root Compose and `.env.example`; `docker compose up` starts full stack, DB and seed | P2/P10, E21; data-distribution conflict D12 |
| B15 | B12 | Root docs architecture diagram/data model/AI disclosure | P10 artifact presence/content check |
| B16 | B12/13 | 5–8 min unlisted all-role/architecture video; repo/deployed URL/accounts/video form; 4 Oct 23:59, late code excluded, keep live through judging/advancement | P10 release checklist |
| B17 | B15 | Datathon independently judged, app integration not required by booklet | P11–P13 standalone; P8 integration retained for team scope |
| B18 | B15/16 | Task 1 label construction, early waiting excluded from service, lateness after window close, no actual test-time journey features | P11, E22 |
| B19 | B16/25 | Task 1 exact rows/IDs/order; fill only nonnegative finite service and [0,1] late probability | P11/P13 template audit |
| B20 | B16/17 | Task 2A ten-week depot/brand total/chilled ordered volume; all orders once including deferred/not-run; requested week; supplied ISO year/week | P12, E22 |
| B21 | B17 | Only Fresh chilled; Style/Tech chilled exactly zero; preserve row_id; no required vehicle/driver conversion | P12/P13 schema/invariant checks |
| B22 | B18/19 | S1 Peliyagoda peak scenario; workshop exclusion; order_ref key; every order served/deferred; blank vehicle/trip when deferred | P13, E23 |
| B23 | B20/21 | Exact seven feasibility rules, official outbound+interstop+handling formula, no return, Fresh 270 and Style+Tech 480 per vehicle, ≤2 total trips | P13, E23; separate operational profile |
| B24 | B21/31 | Approximately one-page priority policy, calculations/bottlenecks/unavoidable versus chosen deferrals; supplied checker confirms feasibility, not optimality | P13 checker output + policy |
| B25 | B22 | No disallowed pretrained models, proprietary API modelling/preprocessing, low/no-code or fully automated modelling; integrity rules | P11–P13 reproducible implementation/disclosure |
| B26 | B22 | Data competition-only, no third-party sharing/public disclosure/derivatives without authorization, confidentiality | P0/P2/P10/P13 data handling and packaging decision D12 |
| B27 | B22 | Model/preprocess/deployment diagrams; prep/labels/cleaning/features rationale; saved models and final notebook with final load/infer/print cell | P13 clean-run evidence |
| B28 | B22/23 | Three exact CSVs, policy, AI disclosure, 3–5 min Datathon demo, `TeamName_Datathon.zip`, 9 Oct 23:59 deadline | P13 complete archive manifest |
| B29 | B24–31 | Clock HH:MM Colombo; durations minutes; route sequences 0-based; master/reference file schemas honored | P2/P11–P13 import/schema tests |
| B30 | B10/13/23 | All scoring categories retained, not only visible UI or ML score | Main plan Section 8 and release evidence |

## Dataset ingestion checklist

Files below are **referenced by the booklet but were not supplied in Source/**. Do not report them loaded or validated until obtained. The eventual importer must preserve original records and produce a validation report with file checksums, row counts, null/duplicate reports, schema and referential-integrity checks.

| File | Required treatment |
|---|---|
| `outlets.csv` | OUT001–OUT120, brand/district/depot, dock_type, parking_constraint, mall_window, window_open/close; retain exact identifiers and attributes |
| `vehicles.csv` | VEH001–VEH060, type/temp, weight/volume, fuel_type/km_per_l/weekly quota, depot; no hardcoded capacity from UI samples |
| `calendar.csv` | date, dow/name/weekend, iso_year/week, payday, festival/festival_ramp, holiday, monsoon, is_operating; shared source for all workflows |
| `district_travel.csv` | district/depot, road_class, free_flow_kmh, depot distance/freeflow time, inter-stop distance/freeflow time |
| `service_allowance.csv` | One row per brand/dock_type; planning allowance minutes, not actual service label |
| `traffic_speed.csv` | Inspect actual complete keys; speed_index 100 free flow/lower slower, monsoon key documented; no guessed join cardinality |
| `road_conditions.csv` | Inspect actual complete keys; date/district disruptions, disruption_index 100 clear/lower disrupted; prediction-time availability check |
| `deliveries_train.csv` | Order identity/date/status/dispatch date, outlet/temp/size, route+sequence, vehicle attributes/planned arrival/windows; preserve not_run demand |
| `route_legs_train.csv` | leg/date/route/seq, vehicle/depot/brand/district, origin/destination, distance, planned and actual times, monsoon/dow; unique leg mapping and label construction |
| `task1_test_inputs.csv` | Planned orders only for Task 1; also permissible order history for Task 2A per booklet; retain row order/IDs |
| `route_legs_test.csv` | Planned-only matching legs; exclude unavailable actual features |
| `task2a_test_inputs.csv` | Exact depot/brand/forecast-week horizon and identifiers for joins to submission row IDs |
| `task2b_peak_day_scenarios.csv` | scenario/order_ref/outlet/network/access/window/temp/size plus deferred_yesterday and days_since_last_served |
| `task2b_peak_day_fleet.csv` | S1 vehicle availability: available versus in_workshop |
| `submission_task1.csv` | Preserve template; fill only two specified predictions; exact original row order |
| `submission_task2a.csv` | Preserve row_id/rows; fill total/chilled volume |
| `submission_task2b.csv` | Preserve scenario/order_ref/outlet_id; fill served/deferred, vehicle_id and trip_id under exact blank-field rules |
| `check_allocation.py` | Run supplied unmodified checker and record output; inspect exact rules without assuming unlisted constraints or optimality |

## Tracking rules

- Add implementation owner, status, task/commit link and evidence link to each row when execution starts.
- A missing UI interaction is a design dependency, not a completed feature. A mocked API is not persisted workflow evidence.
- A Should/Could row stays visible until completed or the team explicitly changes scope. “May be cut” on ADD07 is not an automatic deletion.
- Reconcile any newly obtained detailed Dispatcher document into this matrix before claiming coverage of its quoted 105 FRs/23 NFRs.
- Completion requires matrix coverage **and** the 82-page UI checklist; neither replaces the other.
