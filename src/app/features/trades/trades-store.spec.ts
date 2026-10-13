import { TestBed } from '@angular/core/testing';
import { Collection } from '@signaldb/core';
import createLocalStorageAdapter from '@signaldb/localstorage';
import { beforeEach, describe, expect, it } from 'vitest';
import { deriveTrade } from './trade-math';
import { tradeInput } from './trade-fixtures';
import { TradesStore } from './trades-store';
import type { Trade, TradeInput } from './trade';

const INPUT: TradeInput = {
  asset: 'AAPL',
  market: 'Stocks',
  side: 'Long',
  quantity: 10,
  multiplier: 1,
  entryPrice: 100,
  exitPrice: 110,
  stopPrice: 98,
  takePrice: 115,
  fees: 1,
  openedAt: '2026-10-01T13:30:00.000Z',
  closedAt: '2026-10-01T14:30:00.000Z',
  setup: 'Breakout',
  emotionBefore: 'Calm',
  emotionAfter: 'Disciplined',
  mistake: 'None-followed-plan',
  grade: '',
  chartUrl: '',
  notes: '',
};

describe('TradesStore', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  it('derives Net P&L when a Trade is logged', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    const trade = store.addTrade(INPUT);
    expect(trade.net).toBe(99);
    expect(trade.rMultiple).toBeCloseTo(4.95, 10);
    expect(store.trades().length).toBe(1);
  });

  it('persists logged Trades across reloads', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    store.addTrade(INPUT);
    const raw = new Collection<Trade, string>({
      persistence: createLocalStorageAdapter<Trade, string>(
        'openjournal-trades',
      ),
    });
    await raw.isReady();
    const loaded = raw.find().fetch();
    expect(loaded.length).toBe(1);
    expect(loaded[0]?.asset).toBe('AAPL');
    expect(loaded[0]?.net).toBe(99);
  });

  it('lists Trades newest close first', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    store.addTrade({ ...INPUT, asset: 'OLD', closedAt: '2026-10-01T14:30:00.000Z' });
    store.addTrade({ ...INPUT, asset: 'NEW', closedAt: '2026-10-02T14:30:00.000Z' });
    expect(store.byCloseDesc().map((t) => t.asset)).toEqual(['NEW', 'OLD']);
  });

  it('starts with an inactive global filter over every Trade', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    store.addTrade({ ...INPUT, asset: 'MES', tags: ['FOMC'] });
    expect(store.isFiltering()).toBe(false);
    expect(store.filteredTrades().map((t) => t.asset)).toEqual(['MES']);
  });

  it('filters Trades through the global filter and resets to full journal', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    store.addTrade({ ...INPUT, asset: 'MES', tags: ['FOMC'] });
    store.addTrade({ ...INPUT, asset: 'AAPL', tags: ['earnings'] });
    store.setFilter({ tag: 'FOMC' });
    expect(store.isFiltering()).toBe(true);
    expect(store.filteredTrades().map((t) => t.asset)).toEqual(['MES']);
    store.resetFilter();
    expect(store.isFiltering()).toBe(false);
    expect(store.filteredTrades().length).toBe(2);
  });

  it('trusts the stored frozen Compliance on reload instead of recomputing', async () => {
    const raw = new Collection<Trade, string>({
      persistence: createLocalStorageAdapter<Trade, string>(
        'openjournal-trades',
      ),
    });
    await raw.isReady();
    const frozen = deriveTrade(
      tradeInput({
        rules: [
          { text: 'a', followed: true },
          { text: 'b', followed: false },
        ],
      }),
      'frozen-1',
    );
    raw.insert({ ...frozen, compliance: 75 });
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    expect(store.trades()).toHaveLength(1);
    expect(store.trades()[0]!.compliance).toBe(75);
  });
});
