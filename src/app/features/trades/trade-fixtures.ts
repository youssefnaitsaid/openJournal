import { deriveTrade } from './trade-math';
import type { Trade, TradeInput } from './trade';

export function tradeInput(overrides: Partial<TradeInput> = {}): TradeInput {
  return {
    asset: 'A',
    market: 'Stocks',
    side: 'Long',
    quantity: 10,
    multiplier: 1,
    entryPrice: 100,
    exitPrice: 100,
    stopPrice: null,
    takePrice: null,
    fees: 0,
    openedAt: '2026-10-01T13:30:00.000Z',
    closedAt: '2026-10-01T14:30:00.000Z',
    setup: 'Breakout',
    emotionBefore: 'Calm',
    emotionAfter: 'Calm',
    mistake: 'None-followed-plan',
    chartUrl: '',
    notes: '',
    ...overrides,
  };
}

let seq = 0;

export function tradeFixture(overrides: Partial<TradeInput> = {}): Trade {
  return deriveTrade(tradeInput(overrides), `fixture-${++seq}`);
}
