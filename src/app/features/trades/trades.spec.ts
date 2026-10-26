import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { Trades } from './trades';
import { routes } from '../../app.routes';
import { DEFAULT_PORTFOLIO_ID } from '../../portfolios';
import { TradesStore } from './trades-store';
import { tradeInput } from './trade-fixtures';
import { addTaxonomyValue, setPlaybookArchived, setPlaybookRules } from '../journal/taxonomy';
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
    grade: null,
    chartUrl: '',
    notes: '',
    tags: '',
  };
}

describe('Trades', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
  });

  it('opens on history with the log form hidden behind the hero button', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    store.addTrade(tradeInput({ asset: 'AAPL' }));
    const fixture = TestBed.createComponent(Trades);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('form')).toBeNull();
    const heroButtons = [
      ...compiled.querySelectorAll('[aria-label="Trades hero"] button'),
    ];
    expect(
      heroButtons.some((b) => b.textContent?.includes('Log Trade')),
    ).toBe(true);
    expect(compiled.querySelector('tbody tr')?.textContent).toContain('AAPL');
  });

  it('reveals the form from the hero button and focuses the first field', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    store.addTrade(tradeInput({ asset: 'AAPL' }));
    const fixture = TestBed.createComponent(Trades);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const heroButton = [
      ...compiled.querySelectorAll<HTMLButtonElement>('[aria-label="Trades hero"] button'),
    ].find((b) => b.textContent?.includes('Log Trade'))!;
    heroButton.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(compiled.querySelector('form')).not.toBeNull();
    const assetInput = compiled.querySelector(
      'form #log-asset',
    ) as HTMLInputElement;
    expect(
      compiled.querySelector('form label[for="log-asset"]')?.textContent,
    ).toContain('Asset');
    expect(document.activeElement).toBe(assetInput);
  });

  it('collapses the form after a successful save and the new Trade appears in history', async () => {
    const fixture = TestBed.createComponent(Trades);
    const component = fixture.componentInstance;
    await component.store.whenReady();
    component.store.setActiveId(DEFAULT_PORTFOLIO_ID);
    await fixture.whenStable();
    fixture.componentInstance.openLogForm();
    fixture.detectChanges();
    component.form.setValue(validValues());
    component.onSubmit();
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('form')).toBeNull();
    const rows = [...compiled.querySelectorAll('tbody tr')].map((r) =>
      r.textContent?.replace(/\s+/g, ' '),
    );
    expect(rows.length).toBe(1);
    expect(rows[0]).toContain('AAPL');
  });

  it('shows "No Trades match this filter" with a working Reset when the filter cuts every row', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    store.addTrade(tradeInput({ asset: 'KEEP', tags: ['FOMC'] }));
    const fixture = TestBed.createComponent(Trades);
    await fixture.whenStable();
    store.setFilter({ tag: 'NO-SUCH-TAG' });
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const content = compiled.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(content).toContain('No Trades match this filter');
    expect(content).not.toContain('Log your first Trade');
    const reset = [...compiled.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Reset filters'),
    )!;
    reset.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(store.isFiltering()).toBe(false);
    expect(compiled.querySelector('tbody tr')?.textContent).toContain('KEEP');
  });

  it('offers an onboarding CTA in a truly empty Portfolio and the CTA opens the form', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    store.setActiveId(DEFAULT_PORTFOLIO_ID);
    const fixture = TestBed.createComponent(Trades);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const content = compiled.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(content).toContain('No Trades yet');
    expect(content).toContain('Log your first Trade');
    expect(content).not.toContain('Reset filters');
    const cta = [...compiled.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Log your first Trade'),
    )!;
    cta.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(compiled.querySelector('form')).not.toBeNull();
  });

  it('presents honest "n of m" history counts in the hero while filtering', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    store.addTrade(tradeInput({ asset: 'FOMC-A', tags: ['FOMC'] }));
    store.addTrade(tradeInput({ asset: 'PLAIN-B', closedAt: '2026-10-02T14:30:00.000Z' }));
    store.addTrade(tradeInput({ asset: 'PLAIN-C', closedAt: '2026-10-03T14:30:00.000Z' }));
    const fixture = TestBed.createComponent(Trades);
    await fixture.whenStable();
    const heroText = () =>
      (fixture.nativeElement as HTMLElement)
        .querySelector('[aria-label="Trades hero"]')
        ?.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(heroText()).toContain('3 Trades');
    store.setFilter({ tag: 'FOMC' });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(heroText()).toContain('1 of 3 Trades');
  });

  it('carries a "Manage playbooks" link to Settings and no Playbook CRUD on the page', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    setPlaybookRules('Breakout', ['risk ≤ 1%']);
    const fixture = TestBed.createComponent(Trades);
    await fixture.whenStable();
    fixture.componentInstance.openLogForm();
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('a[href="/settings"]')?.textContent).toContain(
      'Manage playbooks',
    );
    const content = compiled.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(content).not.toContain('Playbook rules for');
    expect(content).not.toContain('Add rule');
    expect(content).not.toContain('Archive');
  });

  it('snapshots the touched checklist when saving through the revealed form', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    setPlaybookRules('Breakout', ['risk ≤ 1%', 'entry on retest']);
    const fixture = TestBed.createComponent(Trades);
    const component = fixture.componentInstance;
    await fixture.whenStable();
    component.openLogForm();
    fixture.detectChanges();
    await fixture.whenStable();
    component.form.setValue(validValues());
    const compiled = fixture.nativeElement as HTMLElement;
    const ruleCheck = compiled.querySelector(
      'form p-checkbox input[type="checkbox"]',
    ) as HTMLElement;
    expect(ruleCheck).not.toBeNull();
    ruleCheck.click();
    fixture.detectChanges();
    await fixture.whenStable();
    component.store.setActiveId(DEFAULT_PORTFOLIO_ID);
    component.onSubmit();
    await fixture.whenStable();
    expect(store.trades()[0]!.rules).toEqual([
      { text: 'risk ≤ 1%', followed: true },
      { text: 'entry on retest', followed: false },
    ]);
    expect(store.trades()[0]!.compliance).toBeCloseTo(50, 10);
    expect((fixture.nativeElement as HTMLElement).querySelector('form')).toBeNull();
  });

  it('keeps the filter bar flat inside the history card with no nested card chrome', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    store.addTrade(tradeInput({ asset: 'AAPL' }));
    const fixture = TestBed.createComponent(Trades);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('p-card[aria-label="Global filter"]')).toBeNull();
    expect(compiled.querySelector('app-filter-bar p-card')).toBeNull();
  });

  it('groups the log form into Trade & execution and Process sections with a FloatLabel per field', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    const fixture = TestBed.createComponent(Trades);
    await fixture.whenStable();
    fixture.componentInstance.openLogForm();
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const form = compiled.querySelector('form')!;
    const headings = [...form.querySelectorAll('h2')].map((h) =>
      h.textContent?.replace(/\s+/g, ' ').trim(),
    );
    expect(headings).toEqual(['Trade & execution', 'Process']);

    const labels = [...form.querySelectorAll<HTMLLabelElement>('label')];
    expect(labels.map((label) => label.textContent?.trim())).toEqual([
      'Asset',
      'Market',
      'Side',
      'Quantity',
      'Multiplier',
      'Entry price',
      'Exit price',
      'Fees',
      'Opened at',
      'Closed at',
      'Setup',
      'Grade',
      'Emotion before',
      'Emotion after',
      'Mistake',
      'Stop price',
      'Take price',
      'Risked Amount',
      'Chart URL',
      'Notes',
      'Tags',
    ]);
    // datetime-local carries a placeholder solely to make FloatLabel float:
    // browsers ignore the placeholder text on date/time inputs.
    for (const label of labels) {
      const id = label.getAttribute('for');
      expect(id).toBeTruthy();
      const field = form.querySelector(`#${id}`);
      expect(field).not.toBeNull();
      expect(field!.closest('p-floatlabel')?.getAttribute('variant')).toBe('in');
    }

    const execution = form.querySelector(
      '[aria-labelledby="log-trade-execution-heading"]',
    );
    const process = form.querySelector(
      '[aria-labelledby="log-trade-process-heading"]',
    );
    expect(execution?.textContent).toContain('Asset');
    expect(execution?.textContent).not.toContain('Chart URL');
    expect(process?.textContent).toContain('Setup');
    expect(process?.textContent).not.toContain('Asset');
    // Every field stays mounted while the phone disclosure is collapsed, so
    // desktop capture keeps the full form visible.
    expect(compiled.querySelectorAll('form label[for]').length).toBe(21);

    // The open form coexists with the always-rendered filter bar; duplicate
    // ids would steal each other's label focus.
    const ids = [...compiled.querySelectorAll<HTMLElement>('[id]')].map(
      (el) => el.id,
    );
    expect(ids.length).toBe(new Set(ids).size);
  });

  it('keeps the optional tail behind a More details disclosure that expands in place', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    const fixture = TestBed.createComponent(Trades);
    await fixture.whenStable();
    fixture.componentInstance.openLogForm();
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const form = compiled.querySelector('form')!;
    const disclosure = form.querySelector<HTMLButtonElement>(
      'button[aria-controls~="log-trade-optional"]',
    )!;
    expect(disclosure).not.toBeNull();
    expect(disclosure.textContent).toContain('More details');
    expect(disclosure.getAttribute('aria-expanded')).toBe('false');
    expect(disclosure.getAttribute('aria-controls')).toBe('log-trade-optional');

    const optional = form.querySelector('#log-trade-optional')!;
    for (const label of [
      'Stop price',
      'Take price',
      'Risked Amount',
      'Chart URL',
      'Notes',
      'Tags',
    ]) {
      expect(optional.textContent).toContain(label);
    }

    disclosure.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(disclosure.getAttribute('aria-expanded')).toBe('true');
    expect(disclosure.textContent).toContain('Fewer details');
    expect(disclosure.textContent).not.toContain('More details');
  });

  it('shows a logged Trade in the table with its Net P&L', async () => {
    const fixture = TestBed.createComponent(Trades);
    const component = fixture.componentInstance;
    await component.store.whenReady();
    component.form.setValue(validValues());
    component.store.setActiveId(DEFAULT_PORTFOLIO_ID);
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
    component.openLogForm();
    fixture.detectChanges();
    component.form.setValue({ ...validValues(), chartUrl: 'not-a-url' });
    component.store.setActiveId(DEFAULT_PORTFOLIO_ID);
    component.onSubmit();
    await fixture.whenStable();
    const store = TestBed.inject(TradesStore);
    expect(store.trades().length).toBe(0);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('valid URL');
    // The only validated field behind the phone disclosure is revealed so the
    // blocking error is never hidden below lg.
    expect(
      compiled
        .querySelector('button[aria-controls~="log-trade-optional"]')
        ?.getAttribute('aria-expanded'),
    ).toBe('true');
  });

  it('banners a breached Guard for today only', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    const now = new Date().toISOString();
    store.addTrade({ ...tradeInput({ asset: 'TODAY-LOSS', exitPrice: 90, fees: 5, closedAt: now }) });
    store.addTrade({ ...tradeInput({ asset: 'OLD-LOSS', exitPrice: 90, fees: 5, closedAt: '2026-10-03T14:30:00.000Z' }) });
    store.setActiveId(DEFAULT_PORTFOLIO_ID);
    store.saveActiveGuards({
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
    store.setActiveId(DEFAULT_PORTFOLIO_ID);
    store.saveActiveGuards({
      daily: { maxLoss: 100, maxTrades: null, stopTime: null },
      weekly: { maxLoss: null, maxTrades: null },
    });
    const fixture = TestBed.createComponent(Trades);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[aria-label="Today guard status"]')).toBeNull();
  });

  it('renders the expansion row content when a Trade row is expanded', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    store.setActiveId(DEFAULT_PORTFOLIO_ID);
    store.addTrade(
      tradeInput({
        asset: 'AAPL',
        notes: 'Held to target',
        rules: [{ text: 'Plan before entry', followed: true }],
      }),
    );
    const fixture = TestBed.createComponent(Trades);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const content = () => compiled.textContent?.replace(/\s+/g, ' ') ?? '';
    // At rest the evidence is folded: notes and snapshot are not rendered.
    expect(content()).not.toContain('Held to target');
    expect(content()).not.toContain('Plan before entry');
    const toggles = [
      ...compiled.querySelectorAll<HTMLButtonElement>('[aria-label="Toggle details"]'),
    ];
    expect(toggles.length).toBe(1);
    toggles[0].click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(content()).toContain('Held to target');
    expect(content()).toContain('Plan before entry');
    expect(content()).toContain('✓ Plan before entry');
    // Expansion state survives a later change-detection pass: the table keeps
    // the note rendered instead of silently clearing the expanded row keys.
    fixture.detectChanges();
    expect(content()).toContain('Held to target');
  });

  it('renders an empty state before any Trade is logged', async () => {
    const fixture = TestBed.createComponent(Trades);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('No Trades yet');
  });

  it('renders the history table without the always-open form at rest', async () => {
    const fixture = TestBed.createComponent(Trades);
    const component = fixture.componentInstance;
    await component.store.whenReady();
    component.store.setActiveId(DEFAULT_PORTFOLIO_ID);
    component.store.addTrade(tradeInput({ asset: 'AAPL' }));
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('form')).toBeNull();
    expect(compiled.querySelector('tbody tr')).not.toBeNull();
  });

  it('does not flag the auto-focused Asset until a submit is attempted', async () => {
    const fixture = TestBed.createComponent(Trades);
    const component = fixture.componentInstance;
    await component.store.whenReady();
    component.openLogForm();
    fixture.detectChanges();
    component.form.controls.asset.markAsTouched();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain(
      'Asset is required',
    );
    component.store.setActiveId(DEFAULT_PORTFOLIO_ID);
    component.onSubmit();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Asset is required',
    );
  });

  it('explains what is missing when submitted empty', async () => {
    const fixture = TestBed.createComponent(Trades);
    const component = fixture.componentInstance;
    await component.store.whenReady();
    component.openLogForm();
    fixture.detectChanges();
    component.form.controls.quantity.setValue(0);
    component.store.setActiveId(DEFAULT_PORTFOLIO_ID);
    component.onSubmit();
    await fixture.whenStable();
    const store = TestBed.inject(TradesStore);
    expect(store.trades().length).toBe(0);
    const compiled = fixture.nativeElement as HTMLElement;
    const content = compiled.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(content).toContain('Asset is required');
    expect(content).toContain('Quantity must be above zero');
    expect(content).toContain('Entry price must be above zero');
    expect(content).toContain('Exit price must be above zero');
    expect(content).toContain('Opened at is required');
    expect(content).toContain('Closed at is required');
  });

  it('rejects zero and negative prices with named-field messages and logs nothing', async () => {
    const fixture = TestBed.createComponent(Trades);
    const component = fixture.componentInstance;
    await component.store.whenReady();
    component.store.setActiveId(DEFAULT_PORTFOLIO_ID);
    component.openLogForm();
    fixture.detectChanges();

    component.form.setValue({ ...validValues(), entryPrice: 0, exitPrice: 0 });
    component.onSubmit();
    await fixture.whenStable();
    const store = TestBed.inject(TradesStore);
    expect(store.trades().length).toBe(0);
    const compiled = fixture.nativeElement as HTMLElement;
    let content = compiled.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(content).toContain('Entry price must be above zero');
    expect(content).toContain('Exit price must be above zero');

    component.form.setValue({ ...validValues(), entryPrice: -5, exitPrice: 110 });
    component.onSubmit();
    await fixture.whenStable();
    expect(store.trades().length).toBe(0);
    content = compiled.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(content).toContain('Entry price must be above zero');
    expect(content).not.toContain('Exit price must be above zero');

    component.form.setValue(validValues());
    component.onSubmit();
    await fixture.whenStable();
    expect(store.trades().length).toBe(1);
  });

  it('offers a user-added setup in the picker without code changes', async () => {
    addTaxonomyValue('setup', 'Opening-drive');
    const fixture = TestBed.createComponent(Trades);
    const component = fixture.componentInstance;
    await component.store.whenReady();
    await fixture.whenStable();
    expect(component.setupOptions()).toContain('Opening-drive');
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

  it('keeps history review-first: exactly Close, Asset, Side, Net P&L, R-Multiple, Setup, Grade, Compliance, Tags', async () => {
    const fixture = TestBed.createComponent(Trades);
    const component = fixture.componentInstance;
    await component.store.whenReady();
    component.form.setValue(validValues());
    component.store.setActiveId(DEFAULT_PORTFOLIO_ID);
    component.onSubmit();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const headers = [...compiled.querySelectorAll('thead th')]
      .map((h) => h.textContent?.replace(/\s+/g, ' ').trim() ?? '')
      .filter((text) => text !== '');
    expect(headers).toEqual([
      'Close',
      'Asset',
      'Side',
      'Net P&L',
      'R-Multiple',
      'Setup',
      'Grade',
      'Compliance',
      'Tags',
    ]);
    expect(compiled.querySelectorAll('tbody tr').length).toBe(1);
  });

  it('moves execution, process, snapshot, and chart detail into the row expansion', async () => {
    const fixture = TestBed.createComponent(Trades);
    const component = fixture.componentInstance;
    await component.store.whenReady();
    component.store.setActiveId(DEFAULT_PORTFOLIO_ID);
    component.store.addTrade(
      tradeInput({
        asset: 'AAPL',
        market: 'Futures',
        quantity: 2,
        multiplier: 5,
        entryPrice: 100,
        exitPrice: 110,
        stopPrice: 98,
        takePrice: 115,
        fees: 1,
        emotionBefore: 'FOMO',
        emotionAfter: 'Disciplined',
        mistake: 'Moved-stop',
        grade: 'B',
        rules: [{ text: 'risk ≤ 1%', followed: true }],
        chartUrl: 'https://example.com/chart',
        notes: 'Held to target',
        tags: ['FOMC'],
      }),
    );
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const content = () =>
      compiled.querySelector('tbody')?.textContent?.replace(/\s+/g, ' ') ?? '';

    // Review-first at rest: execution and process extras are not in the row.
    for (const folded of [
      'Open',
      'Market',
      'Quantity',
      'Multiplier',
      'Entry',
      'Exit',
      'Gross P&L',
      'Fees',
      'Stop',
      'Take',
      'Risked Amount',
      'Emotion before',
      'Emotion after',
      'Mistake',
      'Held to target',
      'risk ≤ 1%',
      'Open chart',
    ]) {
      expect(content()).not.toContain(folded);
    }

    const toggle = compiled.querySelector<HTMLButtonElement>(
      '[aria-label="Toggle details"]',
    )!;
    toggle.click();
    fixture.detectChanges();
    await fixture.whenStable();
    const expanded = content();
    for (const label of [
      'Closed',
      'Open',
      'Market',
      'Quantity',
      'Multiplier',
      'Entry',
      'Exit',
      'Gross P&L',
      'Fees',
      'Stop',
      'Take',
      'Risked Amount',
      'Emotion before',
      'Emotion after',
      'Mistake',
      'Playbook Rule snapshot',
    ]) {
      expect(expanded).toContain(label);
    }
    for (const value of [
      'Futures',
      '$100.00',
      '$1.00',
      '$20.00',
      'FOMO',
      'Disciplined',
      'Moved-stop',
      'Held to target',
      '✓ risk ≤ 1%',
    ]) {
      expect(expanded).toContain(value);
    }
    const chart = compiled.querySelector<HTMLAnchorElement>(
      'a[href="https://example.com/chart"]',
    );
    expect(chart?.textContent).toContain('Open chart');
  });

  it('keeps every visible history column sortable after the execution fields move out', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    store.setActiveId(DEFAULT_PORTFOLIO_ID);
    store.addTrade(tradeInput({ asset: 'WIN-A', exitPrice: 110, closedAt: '2026-10-03T14:30:00.000Z' }));
    store.addTrade(tradeInput({ asset: 'LOSS-B', exitPrice: 90, fees: 5, closedAt: '2026-10-02T14:30:00.000Z' }));
    const fixture = TestBed.createComponent(Trades);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const firstAsset = () =>
      compiled.querySelector('tbody tr')?.textContent?.replace(/\s+/g, ' ') ?? '';
    const header = (label: string) =>
      [...compiled.querySelectorAll<HTMLTableCellElement>('th')].find((h) =>
        h.textContent?.includes(label),
      )!;
    expect(firstAsset()).toContain('WIN-A');
    header('Asset').click();
    await fixture.whenStable();
    expect(firstAsset()).toContain('LOSS-B');
    header('Close').click();
    await fixture.whenStable();
    expect(firstAsset()).toContain('LOSS-B');
  });

  it('renders local dates without raw ISO', async () => {
    const fixture = TestBed.createComponent(Trades);
    const component = fixture.componentInstance;
    await component.store.whenReady();
    component.form.setValue(validValues());
    component.store.setActiveId(DEFAULT_PORTFOLIO_ID);
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
    expect(component.form.controls.grade.value).toBeNull();
    component.form.setValue({ ...validValues(), grade: null });
    component.store.setActiveId(DEFAULT_PORTFOLIO_ID);
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
    component.store.setActiveId(DEFAULT_PORTFOLIO_ID);
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
    component.store.setActiveId(DEFAULT_PORTFOLIO_ID);
    component.onSubmit();
    const store = TestBed.inject(TradesStore);
    expect(store.trades()[0]!.mistake).toBe('Moved-stop');
    expect(store.trades()[0]!.grade).toBe('B');
  });

  it('filters rows by the global Grade and Needs review axes, newest close first', async () => {
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

    store.setFilter({ grade: 'C' });
    expect(component.rows().map((t) => t.asset)).toEqual(['C-MID']);

    store.setFilter({ grade: '', needsReview: true });
    expect(component.rows().map((t) => t.asset)).toEqual([
      'D-NEW',
      'C-MID',
      'D-OLD',
    ]);

    store.setFilter({ grade: 'D' });
    expect(component.rows().map((t) => t.asset)).toEqual(['D-NEW', 'D-OLD']);

    store.setFilter({ grade: 'A' });
    expect(component.rows()).toEqual([]);

    store.resetFilter();
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
    component.store.setActiveId(DEFAULT_PORTFOLIO_ID);
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
    store.setFilter({ grade: 'B' });
    expect(component.rows()).toEqual([]);
    store.setFilter({ grade: 'A' });
    expect(component.rows().map((t) => t.asset)).toEqual(['FOMC-A']);
  });

  it('logs unscored when the playbook checklist is untouched', async () => {
    setPlaybookRules('Breakout', ['risk ≤ 1%', 'entry on retest']);
    const fixture = TestBed.createComponent(Trades);
    const component = fixture.componentInstance;
    await component.store.whenReady();
    expect(component.checks()).toHaveLength(2);
    component.form.setValue(validValues());
    component.store.setActiveId(DEFAULT_PORTFOLIO_ID);
    component.onSubmit();
    const store = TestBed.inject(TradesStore);
    expect(store.trades()).toHaveLength(1);
    expect(store.trades()[0]!.rules).toEqual([]);
    expect(store.trades()[0]!.compliance).toBeNull();
  });

  it('freezes a touched checklist as the Trade snapshot with compliance', async () => {
    setPlaybookRules('Breakout', ['risk ≤ 1%', 'entry on retest']);
    const fixture = TestBed.createComponent(Trades);
    const component = fixture.componentInstance;
    await component.store.whenReady();
    component.form.setValue(validValues());
    component.toggleCheck(0);
    component.store.setActiveId(DEFAULT_PORTFOLIO_ID);
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
    setPlaybookRules('Breakout', ['risk ≤ 1%']);
    const fixture = TestBed.createComponent(Trades);
    const component = fixture.componentInstance;
    await component.store.whenReady();
    component.form.setValue(validValues());
    component.toggleCheck(0);
    component.store.setActiveId(DEFAULT_PORTFOLIO_ID);
    component.onSubmit();
    setPlaybookRules('Breakout', ['risk ≤ 1%', 'entry on retest']);
    const store = TestBed.inject(TradesStore);
    expect(store.trades()[0]!.rules).toEqual([{ text: 'risk ≤ 1%', followed: true }]);
    expect(store.trades()[0]!.compliance).toBe(100);
  });

  it('hides archived Playbooks from the Setup picker while keeping history', async () => {
    const fixture = TestBed.createComponent(Trades);
    const component = fixture.componentInstance;
    await component.store.whenReady();
    expect(component.setupOptions()).toContain('Breakout');
    setPlaybookArchived('Breakout', true);
    expect(component.setupOptions()).not.toContain('Breakout');
    setPlaybookArchived('Breakout', false);
    expect(component.setupOptions()).toContain('Breakout');
  });

  it('scopes table rows to the active portfolio', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    store.setActiveId(DEFAULT_PORTFOLIO_ID);
    store.addTrade({ ...tradeInput({ asset: 'MES' }) });
    store.addPortfolio('Swing');
    store.setActiveId(store.portfolios().find((p) => p.name === 'Swing')!.id);
    store.addTrade({ ...tradeInput({ asset: 'AAPL', closedAt: '2026-10-02T14:30:00.000Z' }) });
    const fixture = TestBed.createComponent(Trades);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const rows = () =>
      [...compiled.querySelectorAll('tbody tr')].map((r) =>
        r.textContent?.replace(/\s+/g, ' '),
      );
    expect(rows().length).toBe(1);
    expect(rows()[0]).toContain('AAPL');
  });

  it('locks the log form while All is active and offers a concrete-Portfolio picker', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    store.addTrade({ ...tradeInput({ asset: 'MES' }) });
    expect(store.addPortfolio('Swing')).toBeNull();
    const fixture = TestBed.createComponent(Trades);
    const component = fixture.componentInstance;
    await fixture.whenStable();
    component.openLogForm();
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(
      (compiled.querySelector('button[type="submit"]') as HTMLButtonElement).disabled,
    ).toBe(true);
    const content = compiled.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(content).toContain('All portfolios is read-only');
    expect(content).toContain('choose a Portfolio');
    expect(
      compiled.querySelector('[aria-label="Portfolio for this Trade"]'),
    ).not.toBeNull();
    expect(component.portfolioOptions().map((option) => option.label)).toEqual([
      'Main',
      'Swing',
    ]);
    component.form.setValue(validValues());
    component.onSubmit();
    expect(store.trades().length).toBe(1);
  });

  it('switches Portfolio from the locked form, preserves the draft, and saves into it', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    store.addTrade(tradeInput({ asset: 'MES' }));
    expect(store.addPortfolio('Swing')).toBeNull();
    const swingId = store.portfolios().find((p) => p.name === 'Swing')!.id;
    const fixture = TestBed.createComponent(Trades);
    const component = fixture.componentInstance;
    await fixture.whenStable();
    component.openLogForm();
    fixture.detectChanges();
    await fixture.whenStable();
    component.form.setValue({ ...validValues(), asset: 'MSFT' });

    component.switchPortfolio({ value: swingId });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(store.activeId()).toBe(swingId);
    expect(component.logFormOpen()).toBe(true);
    expect(component.form.getRawValue().asset).toBe('MSFT');
    const compiled = fixture.nativeElement as HTMLElement;
    expect(
      (compiled.querySelector('button[type="submit"]') as HTMLButtonElement).disabled,
    ).toBe(false);
    expect(compiled.textContent).not.toContain('All portfolios is read-only');
    expect(
      compiled.querySelector('[aria-label="Portfolio for this Trade"]'),
    ).toBeNull();

    component.onSubmit();
    await fixture.whenStable();
    const saved = store.trades().find((trade) => trade.asset === 'MSFT');
    expect(saved?.portfolioId).toBe(swingId);
  });

  it('shares Tag vocabulary across portfolios', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    store.setActiveId(DEFAULT_PORTFOLIO_ID);
    store.addTrade({ ...tradeInput({ asset: 'MES', tags: ['FOMC'] }) });
    store.addPortfolio('Swing');
    store.setActiveId(store.portfolios().find((p) => p.name === 'Swing')!.id);
    const fixture = TestBed.createComponent(Trades);
    const component = fixture.componentInstance;
    await fixture.whenStable();
    expect(component.tagOptions()).toEqual(['FOMC']);
  });

  it('sorts rows by Net P&L through the table header', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    store.setActiveId(DEFAULT_PORTFOLIO_ID);
    store.addTrade(tradeInput({ asset: 'WIN-A', exitPrice: 110, closedAt: '2026-10-03T14:30:00.000Z' }));
    store.addTrade(tradeInput({ asset: 'LOSS-B', exitPrice: 90, fees: 5, closedAt: '2026-10-02T14:30:00.000Z' }));
    const fixture = TestBed.createComponent(Trades);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const firstAsset = () =>
      compiled.querySelector('tbody tr')?.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(firstAsset()).toContain('WIN-A');
    const netHeader = [...compiled.querySelectorAll('th')].find((h) =>
      h.textContent?.includes('Net'),
    )!;
    netHeader.click();
    await fixture.whenStable();
    expect(firstAsset()).toContain('LOSS-B');
  });

  it('paginates long histories instead of rendering every row', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    store.setActiveId(DEFAULT_PORTFOLIO_ID);
    for (let i = 0; i < 12; i++) {
      store.addTrade(
        tradeInput({
          asset: `PAGED-${i}`,
          closedAt: `2026-10-${String(i + 1).padStart(2, '0')}T14:30:00.000Z`,
        }),
      );
    }
    const fixture = TestBed.createComponent(Trades);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('tbody tr').length).toBe(10);
    expect(compiled.querySelector('.p-paginator')).not.toBeNull();
  });
});
