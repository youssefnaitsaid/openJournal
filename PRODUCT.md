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

Nightly logging ritual (entry/exit, Quantity, multiplier, Fees, stop, Setup/Playbook checklist, Emotion before/after, Mistake, Grade, Tags) plus weekly edge review (Dashboard KPIs, Analytics breakdowns, Journal month review). Workflows live in four routes: /dashboard, /trades, /journal, /analytics. Materials on device: `openjournal-trades` SignalDB collection (localStorage), Portfolios (`openjournal-portfolios`, active id in `openjournal-active-portfolio`, All aggregate read-only), taxonomy (`openjournal-taxonomy`: Setup/Emotion/Mistake seeds plus user values, Tags, Playbooks), Guards (`openjournal-guards`, daily/weekly, warn-only). Dates stored UTC ISO, displayed local; calendar and time buckets key off UTC close date.

## Capabilities and Constraints

Confirmed functionality: four routes with unknown paths redirecting to /dashboard; Dashboard KPIs plus balance curve plus recent Trades (newest close first, capped at 10); Trades log form plus full table plus ephemeral global filter (resets on reload and Portfolio switch, cuts Trades table plus Analytics plus a labeled Dashboard strip while hero, curve, streaks, drawdown, month-Net, and Journal stay full-Portfolio); Journal month calendar plus day detail plus month summary (never filtered); Analytics R-metrics plus breakdowns (Setup default, Tag included) plus time patterns (weekday Monday-first, 24 fixed hour buckets, Hold Duration Intraday/1-3d/Swing) plus Compliance-vs-outcome buckets; Guards as optional daily/weekly brakes on loss, count, stop time that never block logging.

Domain truth preserved: Trade is one closed round-trip with entry and exit; Net P&L (Gross minus Fees) is the single source of truth; R-Multiple is Net over Risked Amount, 0 when nothing risked; Win is Net > 0, Loss Net < 0, Breakeven Net = 0, only Wins and Losses count toward win-rate; terms per GLOSSARY.md and derivations per openJournal/.facts.

Constraints: local-first, no backend; starting balance USD-only per Portfolio, default 10000; profit targets out of scope for Guards.

## Brand Commitments

Name openJournal. Standing visual preference (direction round, user-taken canon): default PrimeNG UI — the PrimeNG preset defaults executed at full fidelity, no bespoke visual world. No binding palette, typeface, logo asset, or voice beyond that.

## Evidence on Hand

Real product truth in repo: `GLOSSARY.md` (domain language), `openJournal/.facts` (atomic behavioral spec), `docs/adr/0001-portfolio-design-language.md` (incumbent visual world, now anti-reference for redesign), `docs/adr/0002-playbook-snapshot.md`, `docs/adr/0003-guards-heatmap.md`, `docs/adr/0004-portfolios-all-aggregate.md`, routes in `openJournal/src/app/app.routes.ts`, incumbent implementation in `openJournal/src/app/features/` (dashboard, trades, journal, analytics). No testimonials, customers, benchmarks, pricing, or demo dataset committed — future work must not fabricate them.

## Product Principles

1. Net P&L truth: one derivation seam answers performance; filtered views never create a second truth.
2. Data utility first: density, sortability, and filterability outrank decoration on every Operate surface.
3. Local-first ownership: never block logging, never require network, never send data off device.
4. Process separate from outcome: Compliance, Mistake, and Grade are process signals independent of Net P&L.
