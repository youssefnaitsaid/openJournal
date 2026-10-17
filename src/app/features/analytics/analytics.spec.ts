import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { Analytics } from './analytics';
import { DEFAULT_PORTFOLIO_ID } from '../../portfolios';
import { routes } from '../../app.routes';
import { TradesStore } from '../trades/trades-store';
import { tradeInput } from '../trades/trade-fixtures';

describe('Analytics', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
  });

  async function seed() {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    store.addTrade({
      ...tradeInput({
        asset: 'PLUS-2R',
        quantity: 10,
        entryPrice: 100,
        exitPrice: 120,
        riskedAmount: 100,
        setup: 'Breakout',
      }),
    });
    store.addTrade({
      ...tradeInput({
        asset: 'MINUS-1R',
        quantity: 10,
        entryPrice: 100,
        exitPrice: 90,
        riskedAmount: 100,
        setup: 'Pullback',
        closedAt: '2026-10-02T14:30:00.000Z',
      }),
    });
    store.addTrade({
      ...tradeInput({
        asset: 'ZERO-NOSTOP',
        quantity: 10,
        entryPrice: 100,
        exitPrice: 105,
        closedAt: '2026-10-03T14:30:00.000Z',
      }),
    });
  }

  it('shows ONE honest onboarding state when the Portfolio has no Trades', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    const fixture = TestBed.createComponent(Analytics);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const content = compiled.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(content).toContain('Analytics');
    expect(compiled.querySelectorAll('app-empty-state').length).toBe(1);
    expect(content).toContain('No trades yet');
    expect(content).toContain('Log your first Trade');
    expect(content).not.toContain('No scored trades yet');
    // no zero-filled R-metrics band, no filter bar, no section chrome
    expect(content).not.toContain('R-Expectancy');
    expect(compiled.querySelector('app-filter-bar')).toBeNull();
    expect(compiled.querySelector('[data-testid="breakdowns"]')).toBeNull();
    expect(compiled.querySelector('[data-testid="time-patterns"]')).toBeNull();
  });

  it('shows R-Expectancy, median, sum, and risked coverage from the same Trade list', async () => {
    await seed();
    const fixture = TestBed.createComponent(Analytics);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const content = compiled.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(content).toContain('R-Expectancy');
    expect(content).toContain('+0.33R');
    expect(content).toContain('Median R');
    expect(content).toContain('0.00R');
    expect(content).toContain('+1.00R');
    expect(content).toContain('2 of 3');
  });

  it('charts the true Top 10 by |Net| descending while the table keeps every row', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    const seeded: readonly [string, number][] = [
      ['W300', 130],
      ['W250', 125],
      ['W200', 120],
      ['W100', 110],
      ['W80', 108],
      ['W60', 106],
      ['W40', 104],
      ['L280', 72],
      ['L220', 78],
      ['L180', 82],
      ['L90', 91],
      ['L70', 93],
    ];
    for (const [name, exitPrice] of seeded) {
      store.addTrade(tradeInput({ asset: name, setup: name, exitPrice }));
    }
    const fixture = TestBed.createComponent(Analytics);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const content = compiled.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(content).toContain('Top 10 by |Net|');
    // Hand-computed: (exit - 100) * 10 qty, ordered by |Net| descending.
    // The old Net-desc slice(0, 10) would have shown W60/W40 and dropped L280/L220.
    const chart = fixture.componentInstance.breakdownChart();
    expect(chart.labels).toEqual([
      'W300',
      'L280',
      'W250',
      'L220',
      'W200',
      'L180',
      'W100',
      'L90',
      'W80',
      'L70',
    ]);
    expect(chart.datasets[0].data).toEqual([
      300, -280, 250, -220, 200, -180, 100, -90, 80, -70,
    ]);
    const tableRows = [
      ...compiled
        .querySelector('[data-testid="breakdowns"]')!
        .querySelectorAll('tbody tr'),
    ];
    expect(tableRows.length).toBe(12);
  });

  it('lists breakdowns by Setup default with count, Net, win-rate, and avg R sorted by Net desc', async () => {
    await seed();
    const fixture = TestBed.createComponent(Analytics);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const content = compiled.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(content).toContain('Breakdown by Setup');
    const rows = [...compiled.querySelector('[data-testid="breakdowns"]')!.querySelectorAll('tbody tr')].map((r) =>
      r.textContent?.replace(/\s+/g, ' '),
    );
    expect(rows.length).toBe(2);
    expect(rows[0]).toContain('Breakout');
    expect(rows[0]).toContain('+$250.00');
    expect(rows[0]).toContain('100.00%');
    expect(rows[1]).toContain('Pullback');
  });

  it('switches breakdown dimension via the picker', async () => {    await seed();
    const fixture = TestBed.createComponent(Analytics);
    await fixture.whenStable();
    const component = fixture.componentInstance;
    component.dimension.set('side');
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const content = compiled.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(content).toContain('Breakdown by Side');
    const rows = [...compiled.querySelector('[data-testid="breakdowns"]')!.querySelectorAll('tbody tr')].map((r) =>
      r.textContent?.replace(/\s+/g, ' '),
    );
    expect(rows.length).toBe(1);
    expect(rows[0]).toContain('Long');
  });

  it('offers Tag in the picker and runs metrics over the filtered list', async () => {
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
    const fixture = TestBed.createComponent(Analytics);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const component = fixture.componentInstance;
    expect(component.dimensions.map((d) => d.label)).toContain('Tag');
    component.dimension.set('tag');
    fixture.detectChanges();
    await fixture.whenStable();
    const content = compiled.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(content).toContain('Breakdown by Tag');
    expect(content).toContain('FOMC');
    expect(content).toContain('(Unspecified)');
    store.setFilter({ tag: 'FOMC' });
    fixture.detectChanges();
    await fixture.whenStable();
    const filtered = compiled.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(filtered).toContain('1 of 2');
    expect(filtered).toContain('+2.00R');
  });

  it('offers Grade in the picker and regroups breakdowns by Grade', async () => {    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    store.addTrade(
      tradeInput({
        asset: 'A-WIN',
        quantity: 10,
        entryPrice: 100,
        exitPrice: 120,
        riskedAmount: 100,
        grade: 'A',
      }),
    );
    store.addTrade(
      tradeInput({
        asset: 'D-LOSS',
        quantity: 10,
        entryPrice: 100,
        exitPrice: 90,
        riskedAmount: 100,
        grade: 'D',
        closedAt: '2026-10-02T14:30:00.000Z',
      }),
    );
    const fixture = TestBed.createComponent(Analytics);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const component = fixture.componentInstance;
    expect(component.dimensions.map((d) => d.label)).toContain('Grade');
    expect(component.dimension()).toBe('setup');
    component.dimension.set('grade');
    fixture.detectChanges();
    await fixture.whenStable();
    const content = compiled.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(content).toContain('Breakdown by Grade');
    const rows = [...compiled.querySelector('[data-testid="breakdowns"]')!.querySelectorAll('tbody tr')].map((r) =>
      r.textContent?.replace(/\s+/g, ' '),
    );
    expect(rows.length).toBe(2);
    expect(rows[0]).toContain('A');
    expect(rows[1]).toContain('D');
  });

  it('cuts Analytics sections with the global Grade and Needs review axes', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    store.addTrade(
      tradeInput({
        asset: 'A-WIN',
        quantity: 10,
        entryPrice: 100,
        exitPrice: 120,
        riskedAmount: 100,
        grade: 'A',
      }),
    );
    store.addTrade(
      tradeInput({
        asset: 'D-LOSS',
        quantity: 10,
        entryPrice: 100,
        exitPrice: 90,
        riskedAmount: 100,
        grade: 'D',
        closedAt: '2026-10-02T14:30:00.000Z',
      }),
    );
    const fixture = TestBed.createComponent(Analytics);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const component = fixture.componentInstance;
    component.dimension.set('grade');
    fixture.detectChanges();
    await fixture.whenStable();
    const breakdownRows = () =>
      [...compiled.querySelector('[data-testid="breakdowns"]')!.querySelectorAll('tbody tr')].map(
        (r) => r.textContent?.replace(/\s+/g, ' '),
      );
    expect(breakdownRows().length).toBe(2);
    store.setFilter({ needsReview: true });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(breakdownRows().length).toBe(1);
    expect(breakdownRows()[0]).toContain('D');
    store.setFilter({ grade: 'A' });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(breakdownRows().length).toBe(0);
  });

  it('shows avg compliance per Setup and a full-versus-partial correlation', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    store.addTrade(
      tradeInput({
        asset: 'FULL-WIN',
        quantity: 10,
        entryPrice: 100,
        exitPrice: 120,
        rules: [
          { text: 'a', followed: true },
          { text: 'b', followed: true },
        ],
      }),
    );
    store.addTrade(
      tradeInput({
        asset: 'HALF-LOSS',
        quantity: 10,
        entryPrice: 100,
        exitPrice: 90,
        rules: [
          { text: 'a', followed: true },
          { text: 'b', followed: false },
        ],
        closedAt: '2026-10-02T14:30:00.000Z',
      }),
    );
    const fixture = TestBed.createComponent(Analytics);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const content = compiled.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(content).toContain('Avg Compliance');
    expect(content).toContain('75.00%');
    expect(content).toContain('Compliance vs outcome');
    expect(content).toContain('100% followed');
    expect(content).toContain('Partial');
  });

  it('reads no scored trades yet when unscored Trades exist', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    store.addTrade(tradeInput({ asset: 'UNSCORED' }));
    const fixture = TestBed.createComponent(Analytics);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('No scored trades yet');
  });

  it('says filtered-empty on every surface when the filter cuts every Trade', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    store.addTrade(tradeInput({ asset: 'KEEP' }));
    store.addTrade(
      tradeInput({ asset: 'ALSO', closedAt: '2026-10-02T14:30:00.000Z' }),
    );
    const fixture = TestBed.createComponent(Analytics);
    await fixture.whenStable();
    store.setFilter({ asset: 'NO-SUCH' });
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const content = compiled.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(content).toContain('No Trades match this filter');
    expect(content).not.toContain('No trades yet');
    expect(content).not.toContain('No scored trades yet');
    expect(content).not.toContain('R-Expectancy');
    // each affected surface carries the filtered-empty message
    expect(compiled.querySelectorAll('app-empty-state').length).toBe(3);
    // the global Reset is the escape
    expect(compiled.querySelector('button[aria-label="Reset filter"]')).not.toBeNull();
  });

  it('shows time-patterns by weekday from the filtered list', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    store.addTrade(
      tradeInput({
        asset: 'MON-WIN',
        quantity: 10,
        entryPrice: 100,
        exitPrice: 120,
        riskedAmount: 100,
        closedAt: '2026-10-05T14:30:00.000Z',
      }),
    );
    store.addTrade(
      tradeInput({
        asset: 'TUE-LOSS',
        quantity: 10,
        entryPrice: 100,
        exitPrice: 90,
        riskedAmount: 100,
        setup: 'Pullback',
        closedAt: '2026-10-06T14:30:00.000Z',
      }),
    );
    const fixture = TestBed.createComponent(Analytics);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const section = compiled.querySelector('[data-testid="time-patterns"]');
    expect(section?.textContent?.replace(/\s+/g, ' ')).toContain(
      'Time-pattern by Weekday',
    );
    const rows = [...section!.querySelectorAll('tbody tr')].map((r) =>
      r.textContent?.replace(/\s+/g, ' '),
    );
    expect(rows.length).toBe(7);
    expect(rows[0]).toContain('Monday');
    expect(rows[0]).toContain('+$200.00');
    expect(rows[1]).toContain('Tuesday');
    expect(rows[1]).toContain('-$100.00');
    const component = fixture.componentInstance;
    component.timeDimension.set('hold');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(
      compiled
        .querySelector('[data-testid="time-patterns"]')
        ?.textContent?.replace(/\s+/g, ' '),
    ).toContain('Time-pattern by Hold Duration');
    store.setFilter({ setup: 'Breakout' });
    fixture.detectChanges();
    await fixture.whenStable();
    const filtered = [
      ...compiled
        .querySelector('[data-testid="time-patterns"]')!
        .querySelectorAll('tbody tr'),
    ].map((r) => r.textContent?.replace(/\s+/g, ' '));
    expect(filtered.length).toBe(3);
    expect(filtered[2]).toContain('Swing');
    expect(filtered[2]).toContain('+$200.00');
  });

  it('scopes breakdowns to the active portfolio only', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    store.addTrade({ ...tradeInput({ asset: 'MAIN-WIN', exitPrice: 110, setup: 'Breakout' }) });
    const error = store.addPortfolio('Swing');
    expect(error).toBeNull();
    const swing = store.portfolios().find((p) => p.name === 'Swing')!;
    store.setActiveId(swing.id);
    store.addTrade({
      ...tradeInput({
        asset: 'SWING-LOSS',
        exitPrice: 90,
        setup: 'Pullback',
        closedAt: '2026-10-02T14:30:00.000Z',
      }),
    });
    const fixture = TestBed.createComponent(Analytics);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const breakdowns = () =>
      compiled
        .querySelector('[data-testid="breakdowns"]')
        ?.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(breakdowns()).toContain('Pullback');
    expect(breakdowns()).toContain('-$100.00');
    expect(breakdowns()).not.toContain('Breakout');
    store.setActiveId(DEFAULT_PORTFOLIO_ID);
    await fixture.whenStable();
    expect(breakdowns()).toContain('Breakout');
    expect(breakdowns()).toContain('+$100.00');
    expect(breakdowns()).not.toContain('Pullback');
  });
});
