import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { Dashboard } from './dashboard';
import { ALL_PORTFOLIOS_ID, DEFAULT_PORTFOLIO_ID } from '../../portfolios';
import { TradesStore } from '../trades/trades-store';
import { tradeInput } from '../trades/trade-fixtures';
import { GUARDS_STORAGE_KEY } from '../../guards';

describe('Dashboard', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  async function seed() {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    store.addTrade({
      ...tradeInput({ asset: 'AAPL', exitPrice: 110, fees: 1 }),
    });
    store.addTrade({
      ...tradeInput({
        asset: 'TSLA',
        exitPrice: 90,
        fees: 5,
        closedAt: '2026-10-02T14:30:00.000Z',
      }),
    });
  }

  it('shows every KPI card derived from the same Trade list', async () => {
    await seed();
    const fixture = TestBed.createComponent(Dashboard);
    await fixture.whenStable();
    const text =
      fixture.nativeElement as HTMLElement;
    const content = text.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(content).toContain('-6');
    expect(content).toContain('50.00');
    expect(content).toContain('0.94');
    expect(content).toContain('99');
    expect(content).toContain('-105');
  });

  it('edits Guards beside starting balance and persists them', async () => {
    await seed();
    const store = TestBed.inject(TradesStore);
    store.setActiveId(DEFAULT_PORTFOLIO_ID);
    const fixture = TestBed.createComponent(Dashboard);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const loss = compiled.querySelector(
      'input[aria-label="Daily loss Guard"]',
    ) as HTMLInputElement;
    expect(loss).not.toBeNull();
    loss.value = '200';
    loss.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(localStorage.getItem(GUARDS_STORAGE_KEY)).toContain('200');
  });

  it('rejects an invalid Guard naming it', async () => {
    await seed();
    const fixture = TestBed.createComponent(Dashboard);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const loss = compiled.querySelector(
      'input[aria-label="Daily loss Guard"]',
    ) as HTMLInputElement;
    loss.value = '-50';
    loss.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(compiled.textContent).toContain('Daily loss Guard must be a positive amount');
  });

  it('reports this-week Guard status on full-journal truth', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    const now = new Date().toISOString();
    store.addTrade({ ...tradeInput({ asset: 'WEEK-LOSS', exitPrice: 90, fees: 5, closedAt: now }) });
    store.setActiveId(DEFAULT_PORTFOLIO_ID);
    store.saveActiveGuards({
      daily: { maxLoss: null, maxTrades: null, stopTime: null },
      weekly: { maxLoss: 100, maxTrades: null },
    });
    const fixture = TestBed.createComponent(Dashboard);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Weekly loss Guard');
  });

  it('lists Recent Trades newest-first', async () => {
    await seed();
    const fixture = TestBed.createComponent(Dashboard);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const rows = [...compiled.querySelectorAll('tbody tr')].map((r) =>
      r.textContent?.replace(/\s+/g, ' '),
    );
    expect(rows.length).toBe(2);
    expect(rows[0]).toContain('TSLA');
    expect(rows[1]).toContain('AAPL');
  });

  it('steps the balance curve from the starting balance and persists changes', async () => {
    await seed();
    const store = TestBed.inject(TradesStore);
    store.setActiveId(DEFAULT_PORTFOLIO_ID);
    const fixture = TestBed.createComponent(Dashboard);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('9994');
    const balance = compiled.querySelector(
      'input[aria-label="Starting balance"]',
    ) as HTMLInputElement;
    balance.value = '20000';
    balance.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(compiled.textContent).toContain('19994');
    expect(localStorage.getItem('openjournal-portfolios')).toContain('20000');
  });

  it('shows Infinity as ∞ when there are wins but no losses', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    store.addTrade({ ...tradeInput({ asset: 'AAPL', exitPrice: 110 }) });
    const fixture = TestBed.createComponent(Dashboard);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('∞');
  });

  it('keeps the hero on full-journal truth with a labeled filtered strip', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    store.addTrade(
      tradeInput({
        asset: 'FOMC-WIN',
        quantity: 10,
        entryPrice: 100,
        exitPrice: 120,
        riskedAmount: 100,
        tags: ['FOMC'],
      }),
    );
    store.addTrade(
      tradeInput({
        asset: 'PLAIN-LOSS',
        quantity: 10,
        entryPrice: 100,
        exitPrice: 90,
        riskedAmount: 100,
        closedAt: '2026-10-02T14:30:00.000Z',
      }),
    );
    const fixture = TestBed.createComponent(Dashboard);
    await fixture.whenStable();
    let compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).not.toContain('Filtered view');
    store.setFilter({ tag: 'FOMC' });
    fixture.detectChanges();
    await fixture.whenStable();
    compiled = fixture.nativeElement as HTMLElement;
    const content = compiled.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(content).toContain('Filtered view');
    expect(content).toContain('1 of 2 Trades');
    expect(content).toContain('100');
    expect(content).toContain('100.00');
  });

  it('shows a Total trades KPI card', async () => {
    await seed();
    const fixture = TestBed.createComponent(Dashboard);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const content = compiled.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(content).toContain('Total trades');
    expect(content).toContain('2');
  });

  it('shows drawdown, streaks, and expectancy cards', async () => {
    await seed();
    const fixture = TestBed.createComponent(Dashboard);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const content = compiled.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(content).toContain('Max drawdown');
    expect(content).toContain('$105');
    expect(content).toContain('Streaks');
    expect(content).toContain('W0');
    expect(content).toContain('Expectancy / Trade');
    expect(content).toContain('-$3.00');
  });

  it('renders local dates without raw ISO', async () => {
    await seed();
    const fixture = TestBed.createComponent(Dashboard);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).not.toContain('T14:30:00.000Z');
  });

  it('shows the hero headline with an empty state when nothing is logged', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    const fixture = TestBed.createComponent(Dashboard);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Total Net P&L');
    expect(compiled.textContent).toContain('No recent trades yet.');
    const content = compiled.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(content).toContain('Max drawdown');
    expect(content).toContain('$0 · 0.00%');
    expect(content).toContain('W0 · L0 / Best W0 · L0');
    expect(content).toContain('$0.00');
  });

  it('scopes the hero to the active portfolio and sums All', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    store.setActiveId(DEFAULT_PORTFOLIO_ID);
    store.addTrade({ ...tradeInput({ asset: 'AAPL', exitPrice: 110, fees: 1 }) });
    store.addPortfolio('Swing');
    store.setActiveId(store.portfolios().find((p) => p.name === 'Swing')!.id);
    store.addTrade({
      ...tradeInput({ asset: 'TSLA', exitPrice: 90, fees: 5, closedAt: '2026-10-02T14:30:00.000Z' }),
    });
    const fixture = TestBed.createComponent(Dashboard);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const content = () => compiled.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(content()).toContain('-105');
    expect(content()).toContain('Swing');
    store.setActiveId(ALL_PORTFOLIOS_ID);
    store.setPortfolioBalance(DEFAULT_PORTFOLIO_ID, 20000);
    await fixture.whenStable();
    expect(content()).toContain('-6');
    expect(content()).toContain('All');
    expect(content()).toContain('29994');
  });

  it('locks balance and Guard editing while All is active', async () => {
    await seed();
    const fixture = TestBed.createComponent(Dashboard);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(
      (compiled.querySelector('input[aria-label="Starting balance"]') as HTMLInputElement).disabled,
    ).toBe(true);
    expect(
      (compiled.querySelector('input[aria-label="Daily loss Guard"]') as HTMLInputElement).disabled,
    ).toBe(true);
    expect(compiled.textContent).toContain('per Portfolio');
  });
});
