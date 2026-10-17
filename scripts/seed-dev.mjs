// Deterministic dev-data seed for the MCP visual check (AGENTS.md → Commands).
// Emits full Trade objects — derived fields computed with the same formulas as
// src/app/features/trades/trade-math.ts (gross/net/risked/rMultiple/compliance),
// with valid toISOString() timestamps (hand-built strings have broken the
// DatePipe in the browser console before).
//
// Usage (from openJournal/):
//   node scripts/seed-dev.mjs           # localStorage.setItem(...) line, paste into evaluate_script
//   node scripts/seed-dev.mjs --json    # raw JSON array (curl/pipe/fixture use)
//
// The store loads the key on app start: re-navigate (or reload) after writing it.
// To keep existing browser data, log the current key value before overwriting and
// paste it back afterwards — window state does NOT survive navigation.

const KEY = 'signaldb-collection-openjournal-trades';

const utc = (y, mo, d, h, mi) =>
  new Date(Date.UTC(y, mo - 1, d, h, mi, 0, 0)).toISOString(); // seconds+ms always padded

// A curated 10-trade spread: win, loss, breakeven, no-stop, short, options,
// forex, multi-day, unscored, one breaching the $1,000 daily-loss Guard, and a
// second portfolio (Swing) so the switcher and per-portfolio empty states show.
const INPUTS = [
  { id: 'seed-1', asset: 'AAPL', market: 'Stocks', side: 'Long', quantity: 100, multiplier: 1, entryPrice: 245.0, exitPrice: 251.5, stopPrice: 242.0, takePrice: 253.0, fees: 2.0, openedAt: utc(2026, 10, 6, 13, 31), closedAt: utc(2026, 10, 6, 20, 0), setup: 'Breakout', emotionBefore: 'Calm', emotionAfter: 'Confident', mistake: 'None-followed-plan', grade: 'A', rules: [{ text: 'risk ≤ 1%', followed: true }, { text: 'entry on retest', followed: true }], chartUrl: '', notes: 'Clean retest breakout, scaled out at the high.', tags: ['earnings-week'], portfolioId: 'default' },
  { id: 'seed-2', asset: 'MES', market: 'Futures', side: 'Long', quantity: 2, multiplier: 5, entryPrice: 5450.0, exitPrice: 5432.0, stopPrice: 5430.0, takePrice: 5490.0, fees: 1.2, openedAt: utc(2026, 10, 7, 15, 2), closedAt: utc(2026, 10, 7, 16, 45), setup: 'Trend-continuation', emotionBefore: 'Confident', emotionAfter: 'Frustrated', mistake: 'Moved-stop', grade: 'C', rules: [{ text: 'never widen the stop', followed: false }, { text: 'risk ≤ 1%', followed: true }], chartUrl: '', notes: 'Stop crept down; stopped right under the low.', tags: ['futures'], portfolioId: 'default' },
  { id: 'seed-3', asset: 'NVDA', market: 'Stocks', side: 'Long', quantity: 40, multiplier: 1, entryPrice: 176.2, exitPrice: 183.9, stopPrice: 172.0, takePrice: 186.0, fees: 1.0, openedAt: utc(2026, 10, 8, 13, 40), closedAt: utc(2026, 10, 9, 20, 15), setup: 'Pullback', emotionBefore: 'Anxious', emotionAfter: 'Calm', mistake: 'None-followed-plan', grade: 'B', rules: [{ text: 'risk ≤ 1%', followed: true }, { text: 'no FOMO entry', followed: true }], chartUrl: '', notes: 'Held overnight through the CPI print.', tags: ['swing', 'semis'], portfolioId: 'default' },
  { id: 'seed-4', asset: 'BTCUSD', market: 'Crypto', side: 'Short', quantity: 0.5, multiplier: 1, entryPrice: 111400.0, exitPrice: 108900.0, stopPrice: 113200.0, takePrice: 106000.0, fees: 3.5, openedAt: utc(2026, 10, 9, 2, 10), closedAt: utc(2026, 10, 10, 9, 30), setup: 'Mean-reversion', emotionBefore: 'Disciplined', emotionAfter: 'Disciplined', mistake: 'None-followed-plan', grade: 'A', rules: [{ text: 'fade only at band', followed: true }], chartUrl: '', notes: 'Rejection from the upper band, covered into the flush.', tags: [], portfolioId: 'default' },
  { id: 'seed-5', asset: 'SPY', market: 'Options', side: 'Long', quantity: 3, multiplier: 100, entryPrice: 4.85, exitPrice: 4.85, stopPrice: null, takePrice: null, fees: 6.3, openedAt: utc(2026, 10, 12, 16, 5), closedAt: utc(2026, 10, 12, 20, 5), setup: 'Other', emotionBefore: 'FOMO', emotionAfter: 'Calm', mistake: 'Entered-early/late', grade: '', rules: [], chartUrl: '', notes: 'ATM calls, flat exit at the close — lottery ticket, no stop defined.', tags: ['0dte'], portfolioId: 'default' },
  { id: 'seed-6', asset: 'EURUSD', market: 'Forex', side: 'Short', quantity: 10000, multiplier: 1, entryPrice: 1.0854, exitPrice: 1.0891, stopPrice: 1.0872, takePrice: 1.08, fees: 0.0, openedAt: utc(2026, 10, 13, 8, 20), closedAt: utc(2026, 10, 13, 14, 40), setup: 'Breakout', emotionBefore: 'Calm', emotionAfter: 'Anxious', mistake: 'Revenge-trade', grade: 'D', rules: [{ text: 'one loss then walk', followed: false }], chartUrl: '', notes: 'Broke the daily low, filled right into the loss.', tags: ['fx'], portfolioId: 'default' },
  { id: 'seed-7', asset: 'TSLA', market: 'Stocks', side: 'Long', quantity: 60, multiplier: 1, entryPrice: 421.0, exitPrice: 433.2, stopPrice: 415.0, takePrice: 436.0, fees: 2.0, openedAt: utc(2026, 10, 14, 14, 12), closedAt: utc(2026, 10, 14, 19, 55), setup: 'Gap-and-go', emotionBefore: 'Confident', emotionAfter: 'Confident', mistake: 'None-followed-plan', grade: 'A', rules: [{ text: 'risk ≤ 1%', followed: true }, { text: 'gap holds VWAP', followed: true }], chartUrl: '', notes: 'Opening gap held VWAP all session.', tags: ['gap'], portfolioId: 'default' },
  { id: 'seed-8', asset: 'MSFT', market: 'Stocks', side: 'Long', quantity: 30, multiplier: 1, entryPrice: 468.4, exitPrice: 435.0, stopPrice: 445.0, takePrice: 490.0, fees: 1.5, openedAt: utc(2026, 10, 15, 15, 30), closedAt: utc(2026, 10, 16, 2, 5), setup: 'News-driven', emotionBefore: 'FOMO', emotionAfter: 'Frustrated', mistake: 'Overleveraged', grade: 'D', rules: [{ text: 'risk ≤ 1%', followed: false }, { text: 'no news-chase entries', followed: false }], chartUrl: '', notes: 'Chased the guidance pop; -$1,004 breach of the $1,000 daily-loss Guard.', tags: ['earnings-week'], portfolioId: 'default' },
  { id: 'seed-9', asset: 'META', market: 'Stocks', side: 'Long', quantity: 15, multiplier: 1, entryPrice: 598.0, exitPrice: 611.0, stopPrice: 590.0, takePrice: 620.0, fees: 1.0, openedAt: utc(2026, 10, 16, 15, 5), closedAt: utc(2026, 10, 17, 16, 0), setup: 'Breakout', emotionBefore: 'Calm', emotionAfter: 'Disciplined', mistake: 'None-followed-plan', grade: 'B', rules: [{ text: 'risk ≤ 1%', followed: true }, { text: 'entry on retest', followed: false }], chartUrl: '', notes: 'Round number reclaimed on volume.', tags: [], portfolioId: 'default' },
  { id: 'seed-10', asset: 'AMD', market: 'Stocks', side: 'Long', quantity: 50, multiplier: 1, entryPrice: 214.5, exitPrice: 221.3, stopPrice: 210.0, takePrice: 226.0, fees: 1.0, openedAt: utc(2026, 10, 16, 13, 50), closedAt: utc(2026, 10, 17, 15, 20), setup: 'Pullback', emotionBefore: 'Disciplined', emotionAfter: 'Calm', mistake: 'None-followed-plan', grade: 'A', rules: [{ text: 'risk ≤ 1%', followed: true }], chartUrl: '', notes: 'Swing-book pullback, filled above the 211.0 retest.', tags: ['semis'], portfolioId: 'portfolio-swing' },
];

const trades = INPUTS.map(({ id, ...rest }) => {
  const t = rest;
  const dir = t.side === 'Long' ? 1 : -1;
  const gross = (t.exitPrice - t.entryPrice) * t.quantity * t.multiplier * dir;
  const net = gross - t.fees;
  const risked = t.stopPrice === null ? 0 : Math.abs(t.entryPrice - t.stopPrice) * t.quantity * t.multiplier;
  const rMultiple = risked === 0 ? 0 : net / risked;
  const compliance = t.rules.length === 0 ? null : (t.rules.filter((r) => r.followed).length / t.rules.length) * 100;
  return { id, ...t, grade: t.grade ?? '', portfolioId: t.portfolioId ?? 'default', gross, net, risked, rMultiple, compliance };
});

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(trades, null, 2));
} else {
  console.log(`localStorage.setItem('${KEY}', ${JSON.stringify(JSON.stringify(trades))});`);
}
