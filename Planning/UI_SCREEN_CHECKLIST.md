# NOVA — complete UI implementation checklist

Source: [N0VA (1).pdf](../Source/N0VA%20%281%29.pdf), 82 physical PDF pages. Phase numbers refer to [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md). All rows are **planned, not implemented**. A row completes only after visual comparison plus real interaction/state verification, or explicit classification as design documentation.

The table accounts for every PDF page; it does not imply 82 independent application routes. Reuse common layouts and stateful components while reproducing each reference. Do not hardcode illustrated operational numbers into live services. Exact fixture snapshots and live data must be separate modes. [DECISIONS_AND_GAPS.md](DECISIONS_AND_GAPS.md) records missing designs and contradictions.

## Public entry and authentication — pages 1–15

| UI ID | Page/state | Preserve visually | Behavior and acceptance | Phase |
|---|---|---|---|---|
| U01 | Public landing | Full-width delivery hero and logo, top links, status chips, four feature cards, four role cards, six-step flow, four benefit cards, CTA strip, footer | Sign in and role links route correctly; How it works scrolls to corresponding content; footer destinations are explicitly implemented or recorded as unprovided content, not silently dead links | P1, P2 |
| U02 | Role chooser | Four horizontal role cards and explanatory role-access notice | Selection opens corresponding sign-in; selected role cannot confer backend permission | P1, P2 |
| U03 | Store sign-in | Illustrated green left panel, form card, language selector, prototype demo-outlet panel | Email/staff ID and password authenticate; registered outlet decides brand; fixture chips are isolated from live authorization; reset/back links work | P1, P2 |
| U04 | Dispatcher sign-in | Dispatcher illustration, same split layout, form and locale position | Authenticated Dispatcher lands in allowed depot context; timeout and wrong-role state handled | P1, P2 |
| U05 | Loader sign-in | Loader illustration and role-specific copy in the same shell | Shared depot-terminal identity follows D03; no unscoped anonymous Loader access | P1, P2 |
| U06 | Driver entry modal | Truck icon, explanation and Close / Open mobile sign-in buttons | Open the responsive Driver web experience; dismiss restores prior focus; mobile-app wording conflict D04 retained for review | P1, P2, P6 |
| U07 | Prototype-scope modal | Information icon, exact card style, message and OK | Classify as prototype helper; never use it as a substitute for a required working capability; inventory every invoking action if source prototype becomes available | P1, P14 |
| U08 | Missing sign-in field | Dispatcher sign-in with coral summary, inline email error and retained password | Validate missing identifier without clearing entered password; focus and accessible error association work | P1, P2 |
| U09 | Sign-in network failure | Coral connection message and Try again state | No false authenticated state; retry safely; distinguish network from invalid credentials without leaking account existence | P1, P2 |
| U10 | Desktop reset request | Simple branded header and centered reset card | Submit registered email/staff ID, generic response, valid reset delivery; placeholder “Value/Helper” needs D10 resolution | P1, P2 |
| U11 | Desktop reset acknowledgement | Centered success card, request-received banner and back button | Generic acknowledgement for matching/nonmatching accounts; back route works; actual reset-completion state is unprovided | P1, P2 |
| U12 | Driver landing | Phone artboard, Driver illustration, title, three benefits, sign-in CTA and footer | Phone browser can enter Driver sign-in; no native app required; desktop-only copy about other roles conflicts with their responsive requirement | P1, P2, P6 |
| U13 | Driver sign-in | Mobile header/back, role chip, stacked fields and actions | Phone authentication, password/reset/back behavior, scoped cached-session policy; ambiguous “Label” tracked | P1, P2 |
| U14 | Driver reset request | Mobile form with email and request action | Validates request and returns generic acknowledgement; preserve mobile spacing and back behavior | P1, P2 |
| U15 | Driver reset acknowledgement | Success icon/card and Back to sign in | Reached after real request acceptance; no false claim of confirmed email delivery | P1, P2 |

## Store Manager — pages 16–37

| UI ID | Page/state | Preserve visually | Behavior and acceptance | Phase |
|---|---|---|---|---|
| U16 | Fresh dashboard | Illustrated Store sidebar, context/cutoff header, three summary cards, attention panel, recent issue and calendar guidance | Cutoff/counts/next window/receipt task update from shared state; deferral and shortfall links go to correct order; shared shell adapts across brands | P1, P3, P7 |
| U17 | Fresh place order | Long catalog left, basket right, search/repeat action, All/Dry/Chilled/Favourites, steppers, note, submission/draft and payday card | Search/filter/favorites/repeat/add/remove work; dry and chilled handled separately; rolled-over orders not duplicated; totals reconcile to packing units | P1, P3 |
| U18 | Order submitted | Centered success card with ID, server time, cutoff, delivery, totals and status | Show only after server acknowledgement; View order status and dashboard routes; retry returns same ID | P1, P3 |
| U19 | Submission failed near cutoff | Saved-on-device warning, draft time, countdown, totals, pending status, Retry now / Keep editing | Durably retain draft; server time decides cutoff; automatic/manual retry is idempotent; never show Submitted for unsent data | P1, P3, P9 |
| U20 | Active order list | Table columns, status chips, Edit/View controls, status vocabulary footer | Outlet-only list and correct next step; implement edit eligibility according to D01, not hidden inconsistent logic | P1, P3 |
| U21 | Delivered order detail | Left status timeline and right order summary/receipt/message actions | All milestones link to audit facts; loader shortage persists; Driver delivery awaits separate Store receipt | P1, P3, P7 |
| U22 | Edit submitted order | Editable product list, Add products, totals card, change notice, save/cancel/delete | Versioned changes, recalculated totals and queue/plan revalidation; edit-until-loading conflict D01 must be settled | P1, P3 |
| U23 | Deferred detail | Reason/new date/priority, order summary, consecutive-deferral banner and acknowledgement/message actions | Actual reason, next run and history; acknowledgement persists; no promise of arrival without valid plan | P1, P3, P4 |
| U24 | Delete-order modal | Destructive icon/button and Keep order action | Retain audit and mark canceled instead of deleting history; server rechecks edit policy and current loading status | P1, P3 |
| U25 | Arrival confirmation | Two-step receiving summary, loader note, Confirm arrival / It hasn't arrived | Arrival acknowledgement is separate from count check; non-arrival creates discrepancy/follow-up, not receipt success | P1, P7 |
| U26 | Fresh receipt with shortage | Expected-shortfall alert, three visible receipt choices, product counts, totals card, note/photo | Validate per-line received counts; record 42/44 fixture correctly; shortage links a case; Fresh reservation choice conflicts with R/U37, see D06 | P1, P7 |
| U27 | Receipt recorded | Confirmation with order, timestamp, count, case ID and Reported state | Display real receipt/case IDs and navigate to case; retry cannot create duplicate issue | P1, P7 |
| U28 | History and issues | Issue table above order history, highlighted consecutive chilled deferrals | Persist/query actual histories; do not remove original deferral events after rescheduling; open correct case | P1, P3, P7 |
| U29 | Store resolved-case detail | Lifecycle timeline, loader/driver/store comparison, attributed-stage chip, outcome and confirm/reopen controls | Evidence must exist; record outcome confirmation; permit exactly one reopen server-side; do not penalize wrong stage | P1, P7 |
| U30 | Notifications | Four illustrated notification types, unread count and Acknowledge/View pairs | Deferral, shortfall, delivery and issue events arrive; acknowledgement/read count consistent; deep links scoped | P1, P3, P7 |
| U31 | Store settings | Notification toggles, outlet detail card, request-change action, planned-closure date/action | Persist preferences; submit auditable access/window/closure request; missing locale and change-request states tracked in D14/D15 | P1, P3 |
| U32 | Message Dispatcher modal | Linked order/case context, text area, reply explanation, cancel/send | Persist scoped linked message, acknowledge send/retry, deliver replies into Notifications | P1, P3, P7 |
| U33 | Style ordering variant | Weekly/date/cutoff context, mall-slot notice, category chips, garment catalog, carton basket | One appropriate weekly order schedule, ambient only, mall window, sample catalog units/volume, submit/save draft; shared shell retained | P1, P3 |
| U34 | Style receipt variant | Full/short choices, carton counts and product table, totals card | Correct Style carton quantities; no Tech-only assumptions; evidence/case path for shortage | P1, P7 |
| U35 | Tech ordering variant | Mall slot, categories, pallet/crate catalog, value/fragile labels, declared-value basket and handling note | Multi-line UI retained, one-item orders supported; correct unit conversions and declared value; resolve R single-item wording without redesign | P1, P3 |
| U36 | Tech receipt/reservation | Three receipt options, value summary, packaging-damaged line, reservation note/photo area | Reserve pending inspection with note and/or photo, maintain receipt and issue evidence, correct pallet counts | P1, P7 |
| U37 | Brand-variant explanation | Design documentation, not a normal Store page | Store account owns one brand; shared dashboard/status/deferred/history/notifications/settings; catalog/prices are sample data and referenced component catalog is not supplied | P0, P1, P3 |

## Dispatcher — pages 38–53

| UI ID | Page/state | Preserve visually | Behavior and acceptance | Phase |
|---|---|---|---|---|
| U38 | Closed order queue | Dispatcher illustrated sidebar/context, five metrics, filter chips, prioritized table, generate CTA | Closed eligible queue; new/rolled-over/protected/unusual flags computed; whole list available beyond sample 13/90; generate invokes engine | P1, P4 |
| U39 | Draft plan with violations | Four metrics, vehicle/trip cards, stop chips, utilization bars, right validation list and blocked publish | Violations correspond to actual draft; filters/show-all work; no publish while hard failure; protected outlets and explanation retained | P1, P4 |
| U40 | Move OUT012 suggestion | Focused modal explaining affected orders, weight/volume and timing consequence | Move two whole orders to compatible reefer van, recheck affected trips, preserve audit; fixture values verified before treated as fact | P1, P4 |
| U41 | Trip-budget fix/deferral | Order/service-history card, defer/move options, reason chips, Other note and confirmation | Require valid reason/new run; unavailable alternative truly unavailable; record reason visible to Store; time falls within valid budget | P1, P4 |
| U42 | Corrected draft plan | Reordered/added vehicle cards, 89/90 planned, one deferral, zero failures and enabled review | All values derive from the corrected plan; warnings are not hard failures; consistency anomalies in prototype metrics tracked D11 | P1, P4 |
| U43 | Publish v1 review | Summary and Who is affected columns, protected-outlet/warning detail and publish/back | Validate complete accounting and current versions; clearly identify role recipients; publish transaction is idempotent | P1, P4 |
| U44 | Publish success | Version, publication time, operating day/depot, recipient summary and audit row | Confirm persisted publication; failed recipient delivery is tracked rather than falsely guaranteed; Live Board/back actions work | P1, P4 |
| U45 | Breakdown/change proposal | Critical unavailable banner, affected order table, replacement validation and swap/split/defer options | Hold affected trip; compare actual feasible alternatives; whole orders preserved; operation records mandatory explanatory context | P1, P4 |
| U46 | Publish v2 review | Before/after vehicle, unchanged stops, no-deferral summary, role impacts | Immutable v2, correct Driver reassignment, Loader re-verification event and Store window notice; cancel retains v1 | P1, P4, P5 |
| U47 | Live Board | Trip/stops/late/offline metrics, route table and reconnect-attention banner | Driver events update progress/ETA/sync freshness within target; report delayed/conflicting offline records honestly; no fake GPS data | P1, P6, P8 |
| U48 | Needs Attention | Critical repeated-deferral item, issue warning, unusual-order warning and actions | Priority feed computed; open case/log/message; Resolve with note persists required note; protected status relates to real service history | P1, P4, P7 |
| U49 | Dispatcher case review | Lifecycle, three-stage evidence table, verified-stage chip, credit/replacement/not-verified options and required note | Evidence-driven attribution; persist actual credit/replacement/no-action resolution; only verified stage affects performance | P1, P7 |
| U50 | Case resolved | Confirmation with case/time/outcome/attribution/status and navigation | Store notified with outcome and one-reopen right; display only after case and resolution persistence | P1, P7 |
| U51 | Deferral Log | Search, CSV export, All/Consecutive/Chilled/Last 7 days filters, reason/history table and sample-note footer | Scoping/search/export work; actual delivery versus newly planned date distinguished; historical sample reasons not presented as original dataset facts | P1, P4, P8 |
| U52 | Capacity Forecast | Three tabs, sample disclosure, weekly bars/capacity markers/calendar labels, table, recommendation and +1 reefer toggle | Compute using operating days and explicit assumptions; sample/model provenance correct; tabs work; Task 2A does not supply tonnage/trips directly | P1, P8, P12 |
| U53 | Reference Data | Vehicle/Outlet/Operating calendar tabs, read-only notice, table and workshop Change actions | All relevant depot records visible, including beyond sample rows; only authorized workshop status editable; changed status affects planning | P1, P2, P4 |

## Loader — pages 54–65

| UI ID | Page/state | Preserve visually | Behavior and acceptance | Phase |
|---|---|---|---|---|
| U54 | Trip queue | Loader sidebar, changed-plan notice, five queue metrics, ordered table and temperature labels | Depot-only queue, Fresh urgency, Trip 1/2, filters/sorting and all trips accessible; open current trip/version | P1, P5 |
| U55 | Ambient before-load checks | Not-needed reefer section, numbered reverse-order list, confirmation checkbox and trip summary | Acknowledge last-stop-first; store check identity/time/version; start only after required check | P1, P5 |
| U56 | Active checklist | Long reverse-stop sections, per-line checkboxes/Flag actions, progress and right summary/review | Tick physical quantities, preserve item/order IDs, correct progress and loading order, reversible before confirmation; no silent network loss | P1, P5 |
| U57 | Missing/damaged flag modal | Product/order/planned quantity, two problem choices, quantity stepper, note/photo and actions | Validate affected quantity; store optional evidence and clear success/retry; reach Dispatcher/Store; flags withdrawable before hand-off | P1, P5 |
| U58 | Load confirmation review | Shortfall warning, per-stop loading-order table, totals/flags and confirm/back | Every line accounted for; 215/216 fixture; flags alone do not block hand-off; current plan version required | P1, P5 |
| U59 | Loaded success | Trip/time/count/flag/status confirmation card | Driver readiness occurs after server confirmation; Store and Dispatcher shortfall events tracked; return queue | P1, P5 |
| U60 | Chilled before-load checks | Required reefer reading + confirmation, seven-stop reverse order, rolled-over notes and disabled start | Both readiness checks mandatory; correct reefer vehicle; numeric temperature policy unresolved D16; no loading with missing check | P1, P5 |
| U61 | Offline checklist | Same checklist plus offline header/banner, pending-tick count and Retry sync | Durable local ticks/flags survive lock/restart, retry idempotent, plan-version conflict surfaced; no false synced indicator | P1, P5, P9 |
| U62 | Plan-change review | Critical vehicle-swap banner, before/after cards, moved-versus-unloaded stop table | Correct state diff from v1 to v2; acknowledge with audit; old confirmation invalidated where affected | P1, P4, P5 |
| U63 | Re-verify changed vehicle | Seven stop confirmations, moved/loaded chips, completion count and confirm | Confirm physical transfer/current vehicle in loading order; all required stops verified, version checked again before hand-off | P1, P5 |
| U64 | Re-verified success | New vehicle/trip, confirmation time, moved-stop count and status | New current-version load confirmation reaches reassigned Driver; no phantom hand-off | P1, P5 |
| U65 | Loading issue history | Shift/Yesterday/All filters, table and shared lifecycle note | Flags remain linked to cases and resolutions; selected time range/scoping works | P1, P5, P7 |

## Driver — pages 66–82

| UI ID | Page/state | Preserve visually | Behavior and acceptance | Phase |
|---|---|---|---|---|
| U66 | Today / ready trip | Mobile green header/status/settings, trip summary, Loader note, sequenced stops, Start trip and bottom tabs | Only assigned ready trip; real load state and cached data; distinguish planned versus loaded count; existing fleet Driver assignment retained | P1, P6 |
| U67 | Online Drive Mode | Large next stop, ETA/window, early-arrival pill, progress, safely-stopped and navigation actions | Minimal while driving; safe-stop explicitly unlocks interaction; all displayed status/window data matches trip | P1, P6 |
| U68 | Navigation | Full-screen illustrated map, turn banner, bottom destination/ETA/distance card, exit and voice guidance note | Fixture is explicitly illustrative; real routing needs additional data; exit returns safely; do not silently replace map style | P1, P6 |
| U69 | Online stopped details | Stop/dock/parking/window/order card, expected-shortfall alert, delivered/cannot-deliver/problem actions | Safely stopped state required; mandatory proof/count requirement needs D02-approved interaction before true completion | P1, P6 |
| U70 | Cannot deliver modal | Store closed/access/refusal/window/Other choices, conditional required note, cancel/record | Persist correct unsuccessful outcome, alert Dispatcher/Store, retain timestamp and retryability; cannot silently convert to Delivered | P1, P6 |
| U71 | Trip problem modal | Running late/access/vehicle/Other, optional note and actions | Record operational problem and alert affected roles; Driver goods-issue requirement conflicts with trip-only copy, see D07 | P1, P6 |
| U72 | Online delivery recorded | Delivered card with stop/time/sync plus next-stop and Resume driving | Real acknowledged outcome; Store receipt still independent; resumable route progression | P1, P6 |
| U73 | Offline Drive Mode | Saved-offline status, amber offline strip and same glanceable stop layout | Cached next stop/window works without network, local progress correct; optional navigation limitations disclosed | P1, P6 |
| U74 | Offline stopped details | Offline strip, stop card and same three actions | Durable local recording for core actions; no mandatory network call; proof capture persists too after D02 resolution | P1, P6 |
| U75 | Offline outcome recorded | Saved-offline message, phone-time timestamp, pending count and next-stop action | Show only after successful local storage; survive browser restart; do not report server acknowledgement | P1, P6 |
| U76 | Reconnect / needs review | Sync header, attention banner, three-record list and Review OUT009 | Sync other valid records; conflict remains pending; acknowledge only actual server accepts; opens stopped-only review | P1, P6 |
| U77 | Conflict review | Local/server explanation, two choices, Confirm and sync and audit assurance | Preserve both versions, require authorized selection, record resolution and retry; server “Driver offline—status unknown” text is visible in rendering even where extraction missed it | P1, P6 |
| U78 | Synced success | Success banner, synchronized record list and Continue trip | All three fixture records server-confirmed; pending count cleared only then; chosen version traceable | P1, P6 |
| U79 | All-synced trip completion | Delivery/problem/record totals, depot return notice and End trip | All stops have terminal outcomes and required records/proofs acknowledged; end operation persists and is idempotent | P1, P6 |
| U80 | Completion blocked by pending sync | Same summary, one-unsynced warning, disabled End trip and Go to Sync | Cannot finalize while required record pending; local completion preserved; restore/continue sync without lost outcome | P1, P6 |
| U81 | Display settings | Day/night radio cards, sunset toggle, night-preview button and back | Persist selection; day/night statuses keep meanings; define automatic sunset basis instead of arbitrary timer | P1, P6 |
| U82 | Night Drive Mode | Specific dark-green canvas/cards/header, light action, gold accents and bottom tabs | Match shown palette and spacing; contrast verified; sample-style note tracked as prototype annotation D10 | P1, P6 |

## UI verification protocol

1. Capture at each PDF page's original dimensions using the matching fixture state; use full-page capture for the long catalogs/checklists. Modal dimensions follow their own artboards, not a guessed standard.
2. Compare screenshot overlay with the rendered reference; inspect text wrapping, exact content, original artwork, icon/label pairing, disabled controls, selected tabs, spacings and scroll behavior. Do not hide visible defects with broad image-diff masks. Dynamic timestamps may be controlled by the fixture clock.
3. Record expected-versus-actual screenshots, source page, defect, owner and resolution. Test the actual action and resulting shared state separately from visual comparison.
4. Test additional responsive widths, translated strings, browser zoom, keyboard navigation, focus restoration, reduced motion where applicable and safe areas. The PDF supplies no exact mobile Store or Loader frames; those are explicitly derived designs, not assumed pixel-identical references.
5. Treat sample product prices, prototype text, fake OS status-bar values, illustrative navigation and fixed March timestamps as fixture metadata. The live app must not fabricate signal level, battery state, real navigation or historical business evidence to imitate a screenshot.
6. U07 and U37 are retained in this inventory as prototype/helper documentation. Their presence does not mandate showing explanatory design notes to ordinary end users or replacing required features with “not part of prototype.” Any cleanup of visible placeholder copy must follow the recorded decision process.

## Additional required states without complete NOVA frames

These stay in scope and need component reuse/design review without altering supplied screens: proof/count capture; Driver goods issues and pause/resume; Loader phone layout and filtering controls; Store phone layout, language selection and account settings; safe route-change review; missing-order reminder; knowledge/receiving-window contribution; feedback/driver scoring; supervisor deferral exception; bulk peak-day deferral; trip locks/shift notes; model service/lateness/fairness presentation; reference Outlets/Calendar tab contents; notification delivery failures; outlet-change request form; reset-password completion; wrong-role/credentials/session-expired errors; empty/loading/no-trip/no-orders states; operational navigation if required; fiscal credit/replacement follow-up; end-trip acknowledgement. See the gap register before designing any new screen.
