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

  it('offers a call to action in the empty state', async () => {
    const fixture = TestBed.createComponent(Trades);
    const component = fixture.componentInstance;
    await component.store.whenReady();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const actions = [...compiled.querySelectorAll('button')].filter((b) =>
      b.textContent?.includes('Log trade'),
    );
    expect(actions.length).toBe(2);
    actions[1].click();
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

  it('defaults multiplier from market but keeps manual edits until next switch', async () => {
    const fixture = TestBed.createComponent(Trades);
    const component = fixture.componentInstance;
    await component.store.whenReady();
    await fixture.whenStable();
    expect(component.form.controls.multiplier.value).toBe(1);
    component.form.controls.market.setValue('Futures');
    expect(component.form.controls.multiplier.value).toBe(5);
    component.form.controls.market.setValue('Options');
    expect(component.form.controls.multiplier.value).toBe(100);
    component.form.controls.multiplier.setValue(7);
    expect(component.form.controls.multiplier.value).toBe(7);
    component.form.controls.market.setValue('Stocks');
    expect(component.form.controls.multiplier.value).toBe(1);
  });

  it('shows full trade columns in the table', async () => {
    const fixture = TestBed.createComponent(Trades);
    const component = fixture.componentInstance;
    await component.store.whenReady();
    component.form.setValue(validValues());
    component.onSubmit();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const header =
      compiled.querySelector('thead tr')?.textContent?.replace(/\s+/g, ' ') ??
      '';
    for (const label of [
      'Quantity',
      'Entry',
      'Exit',
      'Gross',
      'Fees',
      'Stop',
      'Take',
      'Risked',
      'Emotion before',
      'Emotion after',
      'Mistake',
      'Multiplier',
      'R-Multiple',
    ]) {
      expect(header).toContain(label);
    }
    const rows = [...compiled.querySelectorAll('tbody tr')].map((r) =>
      r.textContent?.replace(/\s+/g, ' '),
    );
    expect(rows.length).toBe(1);
    for (const value of [
      '10',
      '100',
      '110',
      '100',
      '1',
      '98',
      '115',
      '20',
      'Calm',
      'Disciplined',
      'None-followed-plan',
    ]) {
      expect(rows[0]).toContain(value);
    }
    expect(compiled.querySelector('.overflow-x-auto')).not.toBeNull();
  });

  it('renders local dates without raw ISO', async () => {
    const fixture = TestBed.createComponent(Trades);
    const component = fixture.componentInstance;
    await component.store.whenReady();
    component.form.setValue(validValues());
    component.onSubmit();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).not.toContain('.000Z');
    expect(compiled.textContent).not.toContain('2026-10-01T');
  });
});
