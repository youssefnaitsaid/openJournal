# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Discretionary trader (stocks, futures, options, crypto, forex) logging closed Trades and reviewing edge nightly/weekly. Desktop-first Operate use (scan, sort, filter hundreds of rows fast); mobile only for quick capture. Local-first privacy expectation: data stays on device.

## Product Purpose

Prove the edge: log a closed Trade once, see Dashboard truth derived from Net P&L. Success is faster answers to "where does Net P&L come from?" — by Setup, Asset, Side, time, process signals — not prettier cards.

## Positioning

Trader-owned local-first journal versus cloud journals (TradeZella, Edgewonk, TraderSync). No broker sync, no cloud coach, no community/leaderboard. CSV import and shareable text/image export are the local answers; rule-based report cards and Guard brakes are the on-device discipline answers.

## Operating Context

Nightly logging ritual (entry/exit, Quantity, multiplier, Fees, stop, Setup/Playbook checklist, Emotion before/after, Mistake, Grade, Tags) plus weekly edge review (Dashboard KPIs, Analytics breakdowns, Journal month review). Materials on device: `openjournal-trades` SignalDB collection (localStorage), Portfolios (`openjournal-portfolios`, active id in `openjournal-active-portfolio`, All aggregate read-only), taxonomy (`openjournal-taxonomy`: Setup/Emotion/Mistake seeds plus user values, Tags, Playbooks), Guards (`openjournal-guards`, daily/weekly, warn-only). Dates stored UTC ISO, displayed local; calendar and time buckets key off UTC close date.

## Capabilities and Constraints

Confirmed functionality: five routes, each pinned to one page goal, with unknown paths redirecting to /dashboard:

- /dashboard answers "Where do I stand right now?" — headline Net P&L, one KPI band, read-only Guard status, balance curve, a five-row recent Trades preview with View all.
- /trades answers "Capture a closed Trade once, then find and inspect any Trade fast." — history table owns the viewport; the log form is revealed from the hero.
- /journal answers "Review my process, one month at a time." — UTC close-date calendar, one day detail table, one Month report card.
- /analytics answers "Where does Net P&L come from?" — R-metrics, breakdowns, time patterns, Compliance-vs-outcome.
- /settings answers "How do I configure the journal?" — the only Configure surface: Portfolios CRUD with each Portfolio's starting balance, Guards, Vocabulary, Playbooks (ADR-0007).

Dashboard shows one KPI band plus a read-only Guard status line (shown only when a Guard is configured, linking to /settings) plus balance curve plus a five-row recent Trades preview (newest close first, sortable, with View all to /trades); Trades opens on the history table with the log form hidden behind a hero "Log Trade" button that reveals and focuses it and collapses it after a successful save — the form groups Trade & execution above Process with a FloatLabel per field, keeps every field visible on desktop, and puts the optional tail (Stop/Take/Risked Amount/Chart/Notes/Tags) behind a More details disclosure below lg, with a full-width phone action — an ephemeral global filter (close-date range, Asset substring, Setup/Side/Tag, Win/Loss/Breakeven, Grade, Needs review; resets on reload and Portfolio switch, cuts the Trades table plus Analytics plus a labeled Dashboard strip while hero, curve, streaks, drawdown, month-Net, and Journal stay full-Portfolio) rendered as one flat row at ≥1440 and a Filters (n) disclosure below, plus CSV export; Journal month calendar plus one day detail table plus one Month report card (never filtered); Analytics R-metrics as a band in the breakdown header plus breakdowns (Setup default, Tag included) with the bar chart labeled "Top 10 by |Net|" while the table keeps every row, plus time patterns (weekday Monday-first, 24 fixed hour buckets, Hold Duration Intraday/1-3d/Swing) plus Compliance-vs-outcome buckets; Settings stacking Portfolios CRUD with each Portfolio's starting balance, Guards (under All, a per-Portfolio explanation with no inputs), Vocabulary and Playbooks; empty states distinguish an unpopulated Portfolio (onboarding "Log your first Trade") from filtered-to-zero ("No Trades match this filter" plus Reset; Analytics adds "No scored Trades match this filter" when the filter empties the scored set); Guards as optional daily/weekly brakes on loss, count, stop time that never block logging. The rail stays pinned while pages scroll and carries the Portfolio switcher beside the unfiltered Net P&L at its foot.

Domain truth preserved: Trade is one closed round-trip with entry and exit; Net P&L (Gross minus Fees) is the single source of truth; R-Multiple is Net over Risked Amount, 0 when nothing risked; Win is Net > 0, Loss Net < 0, Breakeven Net = 0, only Wins and Losses count toward win-rate; terms per GLOSSARY.md and derivations per openJournal/.facts.

Constraints: local-first, no backend; starting balance USD-only per Portfolio, default 10000; profit targets out of scope for Guards.

## Brand Commitments

Name openJournal. Standing visual preference (direction round, user-taken canon): default PrimeNG UI — the PrimeNG preset defaults executed at full fidelity, no bespoke visual world. No binding palette, typeface, logo asset, or voice beyond that.

## Evidence on Hand

Real product truth in repo: `GLOSSARY.md` (domain language), `openJournal/.facts` (atomic behavioral spec), `docs/adr/0001-portfolio-design-language.md` (incumbent visual world, now anti-reference for redesign), `docs/adr/0002-playbook-snapshot.md`, `docs/adr/0003-guards-heatmap.md`, `docs/adr/0004-portfolios-all-aggregate.md`, `docs/adr/0007-configure-operate-separation.md` (Configure/Operate split), routes in `openJournal/src/app/app.routes.ts`, incumbent implementation in `openJournal/src/app/features/` (dashboard, trades, journal, analytics, settings). No testimonials, customers, benchmarks, pricing, or demo dataset committed — future work must not fabricate them.

## Product Principles

1. Net P&L truth: one derivation seam answers performance; filtered views never create a second truth.
2. Data utility first: density, sortability, and filterability outrank decoration on every Operate surface.
3. Local-first ownership: never block logging, never require network, never send data off device.
4. Process separate from outcome: Compliance, Mistake, and Grade are process signals independent of Net P&L.
5. One question per surface: each route answers its pinned page goal, and configuration lives only on /settings (ADR-0007).
