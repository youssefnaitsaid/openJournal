import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { Dashboard } from './dashboard';
import { ALL_PORTFOLIOS_ID, DEFAULT_PORTFOLIO_ID } from '../../portfolios';
import { TradesStore } from '../trades/trades-store';
import { tradeInput } from '../trades/trade-fixtures';

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

  it('steps the balance curve from the Portfolio starting balance', async () => {
    await seed();
    const store = TestBed.inject(TradesStore);
    store.setActiveId(DEFAULT_PORTFOLIO_ID);
    const fixture = TestBed.createComponent(Dashboard);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('9994');
    store.setPortfolioBalance(DEFAULT_PORTFOLIO_ID, 20000);
    fixture.detectChanges();
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

  it('cuts the filtered strip with the Grade and Needs review axes while the hero keeps full truth', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    store.addTrade(
      tradeInput({
        asset: 'A-WIN',
        grade: 'A',
        quantity: 10,
        entryPrice: 100,
        exitPrice: 120,
        riskedAmount: 100,
      }),
    );
    store.addTrade(
      tradeInput({
        asset: 'C-LOSS',
        grade: 'C',
        quantity: 10,
        entryPrice: 100,
        exitPrice: 90,
        riskedAmount: 100,
        closedAt: '2026-10-02T14:30:00.000Z',
      }),
    );
    const fixture = TestBed.createComponent(Dashboard);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    store.setFilter({ needsReview: true });
    fixture.detectChanges();
    await fixture.whenStable();
    const content = compiled.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(content).toContain('Filtered view');
    expect(content).toContain('1 of 2 Trades');
    expect(content).toContain('-$100.00');
    expect(content).toContain('0.00%');
    expect(content).toContain('100');
    expect(content).toContain('50.00% win rate');
    store.setFilter({ grade: 'A' });
    fixture.detectChanges();
    await fixture.whenStable();
    const composed = compiled.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(composed).toContain('0 of 2 Trades');
    expect(composed).toContain('50.00% win rate');
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
});
