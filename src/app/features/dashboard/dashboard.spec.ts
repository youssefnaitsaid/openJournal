import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { Dashboard } from './dashboard';
import { ALL_PORTFOLIOS_ID, DEFAULT_PORTFOLIO_ID } from '../../portfolios';
import { routes } from '../../app.routes';
import { TradesStore } from '../trades/trades-store';
import { tradeInput } from '../trades/trade-fixtures';

describe('Dashboard', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
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

  it('renders a real h1 "Dashboard" hero carrying the Net P&L headline, without the kicker idiom', async () => {
    await seed();
    const fixture = TestBed.createComponent(Dashboard);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const h1 = compiled.querySelector('h1');
    expect(h1?.textContent?.trim()).toBe('Dashboard');
    const hero = compiled.querySelector('[aria-label="Dashboard hero"]');
    const heroText = hero?.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(heroText).toContain('-$6.00');
    expect(heroText).not.toContain('Total Net P&L');
    const content = compiled.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(content).not.toContain('Total Net P&L');
  });

  it('shows every KPI value derived from the same Trade list', async () => {
    await seed();
    const fixture = TestBed.createComponent(Dashboard);
    await fixture.whenStable();
    const text =
      fixture.nativeElement as HTMLElement;
    const content = text.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(content).toContain('-$6.00');
    expect(content).toContain('50.00');
    expect(content).toContain('0.94');
    expect(content).toContain('99');
    expect(content).toContain('-105');
  });

  function bandMap(compiled: HTMLElement): Map<string, string> {
    const band = compiled.querySelector('[aria-label="Key metrics"]');
    const map = new Map<string, string>();
    band?.querySelectorAll('dt').forEach((dt) => {
      const label = dt.textContent?.replace(/\s+/g, ' ').trim() ?? '';
      const value =
        dt.nextElementSibling?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
      map.set(label, value);
    });
    return map;
  }

  it('renders one KPI band line per tile the old strip showed', async () => {
    await seed();
    const fixture = TestBed.createComponent(Dashboard);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[aria-label="Key metrics"]')).not.toBeNull();
    const band = bandMap(compiled);
    expect(band.get('Trade win %')).toBe('50.00');
    expect(band.get('Profit factor')).toBe('0.94');
    expect(band.get('Day win %')).toBe('50.00');
    expect(band.get('Avg win / loss')).toBe('99 / -105');
    expect(band.get('Total trades')).toBe('2');
    expect(band.get('Max drawdown')).toBe('$105 · 1.04%');
    expect(band.get('Streaks')).toBe('W0 · L1 / Best W1 · L1');
    expect(band.get('Expectancy / Trade')).toBe('-$3.00');
  });

  it('shows the end-of-curve balance once, as a band line, not repeated under the chart', async () => {
    await seed();
    const store = TestBed.inject(TradesStore);
    store.setActiveId(DEFAULT_PORTFOLIO_ID);
    const fixture = TestBed.createComponent(Dashboard);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(bandMap(compiled).get('Current balance')).toBe('9994');
    // The end value appears exactly once: the redundant big number under the chart is gone.
    const content = compiled.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(content.split('9994').length - 1).toBe(1);
    store.setPortfolioBalance(DEFAULT_PORTFOLIO_ID, 20000);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(bandMap(compiled).get('Current balance')).toBe('19994');
    expect(localStorage.getItem('openjournal-portfolios')).toContain('20000');
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

  it('sorts the Recent Trades table when a column header is clicked', async () => {
    await seed();
    const fixture = TestBed.createComponent(Dashboard);
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const assets = () =>
      [...compiled.querySelectorAll('tbody tr')].map(
        (r) => r.querySelector('td:nth-child(2)')?.textContent?.trim(),
      );
    // Default is newest-close-first: TSLA (2026-10-02) before AAPL.
    expect(assets()).toEqual(['TSLA', 'AAPL']);
    const assetHeader = [...compiled.querySelectorAll('th')].find((th) =>
      th.textContent?.includes('Asset'),
    );
    expect(assetHeader).toBeDefined();
    assetHeader?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    // One click on the sortable Asset header reorders alphabetically ascending.
    expect(assets()).toEqual(['AAPL', 'TSLA']);
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

  it('hides the Guard status line when no Guard is configured', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    store.setActiveId(DEFAULT_PORTFOLIO_ID);
    store.addTrade({ ...tradeInput({ asset: 'AAPL' }) });
    const fixture = TestBed.createComponent(Dashboard);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[aria-label="Guard status"]')).toBeNull();
  });

  it('shows a read-only Guard status line that links to Settings when a Guard is configured', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    store.setActiveId(DEFAULT_PORTFOLIO_ID);
    const now = new Date().toISOString();
    store.addTrade({ ...tradeInput({ asset: 'LOSS', exitPrice: 90, fees: 5, closedAt: now }) });
    store.saveActiveGuards({
      daily: { maxLoss: 50, maxTrades: null, stopTime: null },
      weekly: { maxLoss: null, maxTrades: null },
    });
    const fixture = TestBed.createComponent(Dashboard);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const line = compiled.querySelector('[aria-label="Guard status"]');
    expect(line).not.toBeNull();
    const text = line?.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(text).toContain('Daily loss $105 / $50');
    expect(text).toContain('Breached: Daily loss Guard');
    expect(line?.querySelector('a[href="/settings"]')).not.toBeNull();
    // Never an editor on this page.
    expect(compiled.querySelector('p-inputnumber')).toBeNull();
    expect(compiled.querySelector('p-datepicker')).toBeNull();
  });

  it('shows no Guard status line under the All aggregate', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    store.setActiveId(DEFAULT_PORTFOLIO_ID);
    store.saveActiveGuards({
      daily: { maxLoss: 200, maxTrades: null, stopTime: null },
      weekly: { maxLoss: null, maxTrades: null },
    });
    store.setActiveId(ALL_PORTFOLIOS_ID);
    const fixture = TestBed.createComponent(Dashboard);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    // All is read-only: there is no editable Guard SET, so no status line renders.
    expect(compiled.querySelector('[aria-label="Guard status"]')).toBeNull();
    const content = compiled.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(content).not.toContain('per Portfolio');
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

  it('renders one honest onboarding card when nothing is logged', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    const fixture = TestBed.createComponent(Dashboard);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Log your first Trade');
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
    expect(content()).toContain('-$105.00');
    expect(content()).toContain('Swing');
    store.setActiveId(ALL_PORTFOLIOS_ID);
    store.setPortfolioBalance(DEFAULT_PORTFOLIO_ID, 20000);
    await fixture.whenStable();
    expect(content()).toContain('-$6.00');
    expect(content()).toContain('All');
    expect(content()).toContain('29994');
  });
});
