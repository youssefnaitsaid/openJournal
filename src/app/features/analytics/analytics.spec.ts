import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { Analytics } from './analytics';
import { TradesStore } from '../trades/trades-store';
import { tradeInput } from '../trades/trade-fixtures';

describe('Analytics', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
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

  it('shows the hero with zeros and an empty state when nothing is logged', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    const fixture = TestBed.createComponent(Analytics);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const content = compiled.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(content).toContain('Analytics');
    expect(content).toContain('R-Expectancy');
    expect(content).toContain('No trades yet');
    expect(content).toContain('0.00R');
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

  it('lists breakdowns by Setup default with count, Net, win-rate, and avg R sorted by Net desc', async () => {
    await seed();
    const fixture = TestBed.createComponent(Analytics);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const content = compiled.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(content).toContain('Breakdown by Setup');
    const rows = [...compiled.querySelectorAll('tbody tr')].map((r) =>
      r.textContent?.replace(/\s+/g, ' '),
    );
    expect(rows.length).toBe(2);
    expect(rows[0]).toContain('Breakout');
    expect(rows[0]).toContain('+$250.00');
    expect(rows[0]).toContain('100.00%');
    expect(rows[1]).toContain('Pullback');
  });

  it('switches breakdown dimension via the picker', async () => {
    await seed();
    const fixture = TestBed.createComponent(Analytics);
    await fixture.whenStable();
    const component = fixture.componentInstance;
    component.dimension.set('side');
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const content = compiled.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(content).toContain('Breakdown by Side');
    const rows = [...compiled.querySelectorAll('tbody tr')].map((r) =>
      r.textContent?.replace(/\s+/g, ' '),
    );
    expect(rows.length).toBe(1);
    expect(rows[0]).toContain('Long');
  });
});
