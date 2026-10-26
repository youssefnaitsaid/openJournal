import { TestBed } from '@angular/core/testing';
import { Collection } from '@signaldb/core';
import createLocalStorageAdapter from '@signaldb/localstorage';
import { beforeEach, describe, expect, it } from 'vitest';
import { deriveTrade } from './trade-math';
import { tradeInput } from './trade-fixtures';
import { ALL_PORTFOLIOS_ID, DEFAULT_PORTFOLIO_ID, createPortfolio, savePortfolios, setStartingBalance } from '../../portfolios';
import { hasAnyGuard } from '../../guards';
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

  it('removes exactly the requested Trade and persists the removal', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    store.addTrade({ ...INPUT, asset: 'KEEP' });
    const drop = store.addTrade({ ...INPUT, asset: 'DROP' });
    store.removeTrade(drop.id);
    expect(store.trades().map((t) => t.asset)).toEqual(['KEEP']);
    const raw = new Collection<Trade, string>({
      persistence: createLocalStorageAdapter<Trade, string>(
        'openjournal-trades',
      ),
    });
    await raw.isReady();
    expect(raw.find().fetch().map((t) => t.asset)).toEqual(['KEEP']);
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

  it('trusts the stored frozen Compliance on reload instead of recomputing', async () => {    const raw = new Collection<Trade, string>({
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

  it('files logged Trades into the active named portfolio', async () => {
    const { list } = createPortfolio(
      [
        { id: DEFAULT_PORTFOLIO_ID, name: 'Main', startingBalance: 10000 },
        { id: 'swing', name: 'Swing', startingBalance: 10000 },
      ],
      'Extra',
    );
    savePortfolios(list);
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    store.setActiveId('swing');
    const trade = store.addTrade(INPUT);
    expect(trade.portfolioId).toBe('swing');
    expect(store.activeTrades().map((t) => t.asset)).toEqual(['AAPL']);
  });

  it('falls back to the default portfolio when All is active', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    expect(store.activeId()).toBe(ALL_PORTFOLIOS_ID);
    expect(store.canLog()).toBe(false);
    const trade = store.addTrade(INPUT);
    expect(trade.portfolioId).toBe(DEFAULT_PORTFOLIO_ID);
  });

  it('scopes active lists per portfolio and sums balances for All', async () => {
    savePortfolios(
      setStartingBalance(
        [
          { id: DEFAULT_PORTFOLIO_ID, name: 'Main', startingBalance: 10000 },
          { id: 'swing', name: 'Swing', startingBalance: 20000 },
        ],
        'swing',
        20000,
      ),
    );
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    store.setActiveId(DEFAULT_PORTFOLIO_ID);
    store.addTrade({ ...INPUT, asset: 'MES' });
    store.setActiveId('swing');
    store.addTrade({ ...INPUT, asset: 'AAPL' });
    expect(store.activeTrades().map((t) => t.asset)).toEqual(['AAPL']);
    expect(store.activeBalance()).toBe(20000);
    store.setActiveId(ALL_PORTFOLIOS_ID);
    expect(store.activeTrades()).toHaveLength(2);
    expect(store.activeBalance()).toBe(30000);
    expect(store.canLog()).toBe(false);
  });

  it('persists portfolio switches and resets the global filter', async () => {
    savePortfolios([
      { id: DEFAULT_PORTFOLIO_ID, name: 'Main', startingBalance: 10000 },
      { id: 'swing', name: 'Swing', startingBalance: 10000 },
    ]);
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    store.addTrade({ ...INPUT, asset: 'MES', tags: ['FOMC'] });
    store.setFilter({ tag: 'FOMC' });
    expect(store.isFiltering()).toBe(true);
    store.setActiveId('swing');
    expect(store.isFiltering()).toBe(false);
    expect(localStorage.getItem('openjournal-active-portfolio')).toBe('swing');
  });

  it('reads legacy Trades without a portfolio as the Main Portfolio', async () => {    const raw = new Collection<Trade, string>({
      persistence: createLocalStorageAdapter<Trade, string>(
        'openjournal-trades',
      ),
    });
    await raw.isReady();
    const legacy = deriveTrade(tradeInput({ asset: 'OLD' }), 'legacy-1');
    const { portfolioId: _dropped, ...stored } = legacy;
    raw.insert(stored as Trade);
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    expect(store.trades()).toHaveLength(1);
    expect(store.trades()[0]!.portfolioId).toBe(DEFAULT_PORTFOLIO_ID);
    store.setActiveId(DEFAULT_PORTFOLIO_ID);
    expect(store.activeTrades().map((t) => t.asset)).toEqual(['OLD']);
  });

  it('holds no Guard status on All and per-portfolio Guards when named', async () => {
    savePortfolios([
      { id: DEFAULT_PORTFOLIO_ID, name: 'Main', startingBalance: 10000 },
      { id: 'swing', name: 'Swing', startingBalance: 10000 },
    ]);
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    expect(store.isAll()).toBe(true);
    expect(hasAnyGuard(store.activeGuards())).toBe(false);
    store.setActiveId('swing');
    store.saveActiveGuards({
      daily: { maxLoss: 200, maxTrades: null, stopTime: null },
      weekly: { maxLoss: null, maxTrades: null },
    });
    expect(store.activeGuards().daily.maxLoss).toBe(200);
    store.setActiveId(DEFAULT_PORTFOLIO_ID);
    expect(hasAnyGuard(store.activeGuards())).toBe(false);
  });

  it('ignores Guard saves while All is active', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    store.saveActiveGuards({
      daily: { maxLoss: 200, maxTrades: null, stopTime: null },
      weekly: { maxLoss: null, maxTrades: null },
    });
    expect(localStorage.getItem('openjournal-guards')).toBeNull();
    expect(hasAnyGuard(store.activeGuards())).toBe(false);
  });

  it('destroys the deleted portfolio’s Trades, balance, and Guards only', async () => {
    savePortfolios([
      { id: DEFAULT_PORTFOLIO_ID, name: 'Main', startingBalance: 10000 },
      { id: 'swing', name: 'Swing', startingBalance: 20000 },
    ]);
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    store.setActiveId('swing');
    store.addTrade({ ...INPUT, asset: 'DOOMED' });
    store.saveActiveGuards({
      daily: { maxLoss: 200, maxTrades: null, stopTime: null },
      weekly: { maxLoss: null, maxTrades: null },
    });
    expect(store.removePortfolio('swing')).toBeNull();
    expect(store.portfolios().map((p) => p.name)).toEqual(['Main']);
    expect(store.trades().length).toBe(0);
    expect(hasAnyGuard(store.activeGuards())).toBe(false);
    expect(JSON.parse(localStorage.getItem('openjournal-guards') ?? '{}')).not.toHaveProperty(
      'swing',
    );
  });
});
