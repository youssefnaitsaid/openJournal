import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { Trades } from './trades';
import { TradesStore } from './trades-store';
import { tradeInput } from './trade-fixtures';
import { saveGuards } from '../../guards';
import type { Emotion, Grade, Market, Mistake, Setup, Side } from './trade';

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
    grade: '' as Grade,
    chartUrl: '',
    notes: '',
    tags: '',
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

  it('banners a breached Guard for today only', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    const now = new Date().toISOString();
    store.addTrade({ ...tradeInput({ asset: 'TODAY-LOSS', exitPrice: 90, fees: 5, closedAt: now }) });
    store.addTrade({ ...tradeInput({ asset: 'OLD-LOSS', exitPrice: 90, fees: 5, closedAt: '2026-10-03T14:30:00.000Z' }) });
    saveGuards({
      daily: { maxLoss: 100, maxTrades: null, stopTime: null },
      weekly: { maxLoss: null, maxTrades: null },
    });
    const fixture = TestBed.createComponent(Trades);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const banner = compiled.querySelector('[aria-label="Today guard status"]');
    expect(banner?.textContent?.replace(/\s+/g, ' ')).toContain('Daily loss Guard');
  });

  it('stays quiet when today has no breach', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    store.addTrade({ ...tradeInput({ asset: 'OLD-LOSS', exitPrice: 90, fees: 5, closedAt: '2026-10-03T14:30:00.000Z' }) });
    saveGuards({
      daily: { maxLoss: 100, maxTrades: null, stopTime: null },
      weekly: { maxLoss: null, maxTrades: null },
    });
    const fixture = TestBed.createComponent(Trades);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[aria-label="Today guard status"]')).toBeNull();
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

  it('defaults Grade to blank and logs ungraded Trades when untouched', async () => {
    const fixture = TestBed.createComponent(Trades);
    const component = fixture.componentInstance;
    await component.store.whenReady();
    expect(component.form.controls.grade.value).toBe('');
    component.form.setValue({ ...validValues(), grade: '' as Grade });
    component.onSubmit();
    const store = TestBed.inject(TradesStore);
    expect(store.trades()).toHaveLength(1);
    expect(store.trades()[0]!.grade).toBe('');
  });

  it('persists the chosen Grade and shows it as a badge in the table', async () => {
    const fixture = TestBed.createComponent(Trades);
    const component = fixture.componentInstance;
    await component.store.whenReady();
    component.form.setValue({ ...validValues(), grade: 'B' as Grade });
    component.onSubmit();
    await fixture.whenStable();
    const store = TestBed.inject(TradesStore);
    expect(store.trades()[0]!.grade).toBe('B');
    const compiled = fixture.nativeElement as HTMLElement;
    const header =
      compiled.querySelector('thead tr')?.textContent?.replace(/\s+/g, ' ') ??
      '';
    expect(header).toContain('Grade');
    const rows = [...compiled.querySelectorAll('tbody tr')].map((r) =>
      r.textContent?.replace(/\s+/g, ' '),
    );
    expect(rows.length).toBe(1);
    expect(rows[0]).toContain('B');
  });

  it('keeps Grade independent of Mistake', async () => {
    const fixture = TestBed.createComponent(Trades);
    const component = fixture.componentInstance;
    await component.store.whenReady();
    component.form.setValue({
      ...validValues(),
      mistake: 'Moved-stop' as Mistake,
      grade: 'B' as Grade,
    });
    component.onSubmit();
    const store = TestBed.inject(TradesStore);
    expect(store.trades()[0]!.mistake).toBe('Moved-stop');
    expect(store.trades()[0]!.grade).toBe('B');
  });

  it('filters by Grade and reviews C and D worst-first, restoring defaults off', async () => {
    const fixture = TestBed.createComponent(Trades);
    const component = fixture.componentInstance;
    await component.store.whenReady();
    const store = TestBed.inject(TradesStore);
    store.addTrade(
      tradeInput({ asset: 'A-OLD', grade: 'A', closedAt: '2026-10-01T14:30:00.000Z' }),
    );
    store.addTrade(
      tradeInput({ asset: 'C-MID', grade: 'C', closedAt: '2026-10-02T14:30:00.000Z' }),
    );
    store.addTrade(
      tradeInput({ asset: 'D-NEW', grade: 'D', closedAt: '2026-10-03T14:30:00.000Z' }),
    );
    store.addTrade(
      tradeInput({ asset: 'D-OLD', grade: 'D', closedAt: '2026-10-02T10:30:00.000Z' }),
    );
    expect(component.rows().map((t) => t.asset)).toEqual([
      'D-NEW',
      'C-MID',
      'D-OLD',
      'A-OLD',
    ]);

    component.gradeFilter.set('C');
    expect(component.rows().map((t) => t.asset)).toEqual(['C-MID']);

    component.gradeFilter.set('');
    component.toggleReview();
    expect(component.rows().map((t) => t.asset)).toEqual([
      'D-NEW',
      'D-OLD',
      'C-MID',
    ]);

    component.gradeFilter.set('D');
    expect(component.rows().map((t) => t.asset)).toEqual(['D-NEW', 'D-OLD']);

    component.gradeFilter.set('A');
    expect(component.rows()).toEqual([]);

    component.gradeFilter.set('');
    component.toggleReview();
    expect(component.gradeFilter()).toBe('');
    expect(component.rows().map((t) => t.asset)).toEqual([
      'D-NEW',
      'C-MID',
      'D-OLD',
      'A-OLD',
    ]);
  });

  it('logs comma-separated Tags normalized and grows the Tag list', async () => {
    const fixture = TestBed.createComponent(Trades);
    const component = fixture.componentInstance;
    await component.store.whenReady();
    component.form.setValue({ ...validValues(), tags: 'FOMC, earnings , FOMC,' });
    component.onSubmit();
    await fixture.whenStable();
    const store = TestBed.inject(TradesStore);
    expect(store.trades()[0]!.tags).toEqual(['FOMC', 'earnings']);
    expect(component.tagOptions()).toEqual(['FOMC', 'earnings']);
    const compiled = fixture.nativeElement as HTMLElement;
    const rows = [...compiled.querySelectorAll('tbody tr')].map((r) =>
      r.textContent?.replace(/\s+/g, ' '),
    );
    expect(rows.length).toBe(1);
    expect(rows[0]).toContain('FOMC');
    expect(rows[0]).toContain('earnings');
  });

  it('narrows rows through the global filter and composes with Grade', async () => {
    const fixture = TestBed.createComponent(Trades);
    const component = fixture.componentInstance;
    await component.store.whenReady();
    const store = TestBed.inject(TradesStore);
    store.addTrade(
      tradeInput({ asset: 'FOMC-A', grade: 'A', tags: ['FOMC'] }),
    );
    store.addTrade(tradeInput({ asset: 'PLAIN-B', grade: 'B' }));
    expect(component.rows().map((t) => t.asset)).toEqual(['FOMC-A', 'PLAIN-B']);
    store.setFilter({ tag: 'FOMC' });
    expect(component.rows().map((t) => t.asset)).toEqual(['FOMC-A']);
    component.gradeFilter.set('B');
    expect(component.rows()).toEqual([]);
    component.gradeFilter.set('A');
    expect(component.rows().map((t) => t.asset)).toEqual(['FOMC-A']);
  });

  it('logs unscored when the playbook checklist is untouched', async () => {
    const fixture = TestBed.createComponent(Trades);
    const component = fixture.componentInstance;
    await component.store.whenReady();
    component.addRule('risk ≤ 1%');
    component.addRule('entry on retest');
    expect(component.checks()).toHaveLength(2);
    component.form.setValue(validValues());
    component.onSubmit();
    const store = TestBed.inject(TradesStore);
    expect(store.trades()).toHaveLength(1);
    expect(store.trades()[0]!.rules).toEqual([]);
    expect(store.trades()[0]!.compliance).toBeNull();
  });

  it('freezes a touched checklist as the Trade snapshot with compliance', async () => {
    const fixture = TestBed.createComponent(Trades);
    const component = fixture.componentInstance;
    await component.store.whenReady();
    component.addRule('risk ≤ 1%');
    component.addRule('entry on retest');
    component.form.setValue(validValues());
    component.toggleCheck(0);
    component.onSubmit();
    await fixture.whenStable();
    const store = TestBed.inject(TradesStore);
    expect(store.trades()[0]!.rules).toEqual([
      { text: 'risk ≤ 1%', followed: true },
      { text: 'entry on retest', followed: false },
    ]);
    expect(store.trades()[0]!.compliance).toBeCloseTo(50, 10);
    const compiled = fixture.nativeElement as HTMLElement;
    const header =
      compiled.querySelector('thead tr')?.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(header).toContain('Compliance');
    const rows = [...compiled.querySelectorAll('tbody tr')].map((r) =>
      r.textContent?.replace(/\s+/g, ' '),
    );
    expect(rows[0]).toContain('50.00%');
  });

  it('keeps the snapshot frozen when playbook rules change later', async () => {
    const fixture = TestBed.createComponent(Trades);
    const component = fixture.componentInstance;
    await component.store.whenReady();
    component.addRule('risk ≤ 1%');
    component.form.setValue(validValues());
    component.toggleCheck(0);
    component.onSubmit();
    component.addRule('entry on retest');
    const store = TestBed.inject(TradesStore);
    expect(store.trades()[0]!.rules).toEqual([{ text: 'risk ≤ 1%', followed: true }]);
    expect(store.trades()[0]!.compliance).toBe(100);
  });

  it('hides archived setups from the picker while keeping history', async () => {
    const fixture = TestBed.createComponent(Trades);
    const component = fixture.componentInstance;
    await component.store.whenReady();
    expect(component.setupOptions()).toContain('Breakout');
    component.togglePlaybookArchived();
    expect(component.setupOptions()).not.toContain('Breakout');
    expect(component.archivedPlaybooks()).toContain('Breakout');
    component.unarchivePlaybook('Breakout');
    expect(component.setupOptions()).toContain('Breakout');
    expect(component.archivedPlaybooks()).not.toContain('Breakout');
  });
});
