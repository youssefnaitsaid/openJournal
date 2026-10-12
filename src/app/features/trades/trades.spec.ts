import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { Trades } from './trades';
import { TradesStore } from './trades-store';
import type { Emotion, Market, Mistake, Setup, Side } from './trade';

function validValues() {
  return {
    asset: 'AAPL',
    market: 'Stocks' as Market,
    side: 'Long' as Side,
    quantity: 10,
    multiplier: 1,
    entryPrice: 100,
    exitPrice: 110,
    stopPrice: 98,
    takePrice: 115,
    riskedAmount: null,
    fees: 1,
    openedAt: '2026-10-01T13:30',
    closedAt: '2026-10-01T14:30',
    setup: 'Breakout' as Setup,
    emotionBefore: 'Calm' as Emotion,
    emotionAfter: 'Disciplined' as Emotion,
    mistake: 'None-followed-plan' as Mistake,
    chartUrl: '',
    notes: '',
  };
}

describe('Trades', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  it('shows a logged Trade in the table with its Net P&L', async () => {
    const fixture = TestBed.createComponent(Trades);
    const component = fixture.componentInstance;
    await component.store.whenReady();
    component.form.setValue(validValues());
    component.onSubmit();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const rows = [...compiled.querySelectorAll('tbody tr')].map((r) =>
      r.textContent?.replace(/\s+/g, ' '),
    );
    expect(rows.length).toBe(1);
    expect(rows[0]).toContain('AAPL');
    expect(rows[0]).toContain('99');
  });

  it('rejects an invalid chart URL and keeps the table empty', async () => {
    const fixture = TestBed.createComponent(Trades);
    const component = fixture.componentInstance;
    await component.store.whenReady();
    component.form.setValue({ ...validValues(), chartUrl: 'not-a-url' });
    component.onSubmit();
    await fixture.whenStable();
    const store = TestBed.inject(TradesStore);
    expect(store.trades().length).toBe(0);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('valid URL');
  });

  it('renders an empty state before any Trade is logged', async () => {
    const fixture = TestBed.createComponent(Trades);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('No trades yet');
  });

  it('explains what is missing when submitted empty', async () => {
    const fixture = TestBed.createComponent(Trades);
    const component = fixture.componentInstance;
    await component.store.whenReady();
    component.form.controls.quantity.setValue(0);
    component.onSubmit();
    await fixture.whenStable();
    const store = TestBed.inject(TradesStore);
    expect(store.trades().length).toBe(0);
    const compiled = fixture.nativeElement as HTMLElement;
    const content = compiled.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(content).toContain('Asset is required');
    expect(content).toContain('Quantity must be above zero');
    expect(content).toContain('Opened at is required');
    expect(content).toContain('Closed at is required');
  });

  it('offers a user-added setup without code changes', async () => {    const fixture = TestBed.createComponent(Trades);
    const component = fixture.componentInstance;
    component.addCustomSetup('Opening-drive');
    await fixture.whenStable();
    expect(component.setupOptions()).toContain('Opening-drive');
    const compiled = fixture.nativeElement as HTMLElement;
    const setup = compiled.querySelector(
      'select[formControlName="setup"]',
    ) as HTMLSelectElement;
    expect([...setup.options].map((o) => o.value)).toContain('Opening-drive');
    expect(
      JSON.parse(
        localStorage.getItem('openjournal-taxonomy') ?? '{}',
      ).setup,
    ).toContain('Opening-drive');
  });
});
