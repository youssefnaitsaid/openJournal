import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { Dashboard } from './dashboard';
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

  it('steps the balance curve from the starting balance and persists changes', async () => {
    await seed();
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
    expect(localStorage.getItem('openjournal-starting-balance')).toBe('20000');
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

  it('shows a Total trades KPI card', async () => {
    await seed();
    const fixture = TestBed.createComponent(Dashboard);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const content = compiled.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(content).toContain('Total trades');
    expect(content).toContain('2');
  });

  it('renders local dates without raw ISO', async () => {
    await seed();
    const fixture = TestBed.createComponent(Dashboard);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).not.toContain('T14:30:00.000Z');
  });
});
