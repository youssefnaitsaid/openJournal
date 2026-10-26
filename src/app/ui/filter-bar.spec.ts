import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { FilterBar } from './filter-bar';
import { TradesStore } from '../features/trades/trades-store';
import { tradeInput } from '../features/trades/trade-fixtures';

describe('FilterBar', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  async function harness(tags: string[][] = [['FOMC'], ['earnings']]) {
    const fixture = TestBed.createComponent(FilterBar);
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    for (const t of tags) {
      store.addTrade(
        tradeInput({
          asset: t[0] ?? 'X',
          closedAt: '2026-10-02T14:30:00.000Z',
          tags: t,
        }),
      );
    }
    await fixture.whenStable();
    return { fixture, store };
  }

  it('renders all eight filter axes', async () => {
    const { fixture } = await harness();
    const compiled = fixture.nativeElement as HTMLElement;
    for (const label of [
      'From',
      'To',
      'Asset',
      'Setup',
      'Side',
      'Tag',
      'Outcome',
      'Grade',
      'Needs review',
    ]) {
      expect(compiled.textContent).toContain(label);
    }
  });

  it('renders as a flat toolbar without wrapping itself in a card', async () => {
    const { fixture } = await harness();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('p-card')).toBeNull();
  });

  it('collapses to a flat Filters disclosure that counts active axes', async () => {
    const { fixture, store } = await harness();
    const compiled = fixture.nativeElement as HTMLElement;
    const disclosure = compiled.querySelector(
      'button[aria-controls="filter-fields"]',
    ) as HTMLButtonElement;

    expect(disclosure).not.toBeNull();
    expect(disclosure.tagName).toBe('BUTTON');
    expect(disclosure.getAttribute('type')).toBe('button');
    expect(disclosure.textContent?.trim()).toBe('Filters');

    store.setFilter({ asset: 'fomc' });
    await fixture.whenStable();
    expect(disclosure.textContent?.trim()).toBe('Filters (1)');

    // The close-date range is one axis even when both ends are set.
    store.setFilter({
      dateFrom: '2026-10-01',
      dateTo: '2026-10-03',
      side: 'Long',
    });
    await fixture.whenStable();
    expect(disclosure.textContent?.trim()).toBe('Filters (3)');

    store.setFilter({
      setup: 'Breakout',
      tag: 'FOMC',
      outcome: 'Win',
      grade: 'A',
      needsReview: true,
    });
    await fixture.whenStable();
    expect(disclosure.textContent?.trim()).toBe('Filters (8)');
  });

  it('expands the one filter bar in place from the disclosure', async () => {
    const { fixture } = await harness();
    const compiled = fixture.nativeElement as HTMLElement;
    const disclosure = compiled.querySelector(
      'button[aria-controls="filter-fields"]',
    ) as HTMLButtonElement;
    const fields = compiled.querySelector('#filter-fields') as HTMLElement;

    expect(fields).not.toBeNull();
    expect(disclosure.getAttribute('aria-expanded')).toBe('false');

    disclosure.click();
    await fixture.whenStable();
    expect(disclosure.getAttribute('aria-expanded')).toBe('true');
    // Still the same single bar: no second set of controls appeared.
    expect(compiled.querySelectorAll('p-datepicker').length).toBe(2);
    expect(compiled.querySelectorAll('p-checkbox').length).toBe(1);

    disclosure.click();
    await fixture.whenStable();
    expect(disclosure.getAttribute('aria-expanded')).toBe('false');
  });

  it('renders Reset as an icon-only action with an accessible name only while filtering', async () => {
    const { fixture, store } = await harness();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(
      compiled.querySelector('button[aria-label="Reset filter"]'),
    ).toBeNull();

    store.setFilter({ asset: 'fomc' });
    await fixture.whenStable();
    const reset = compiled.querySelector(
      'button[aria-label="Reset filter"]',
    ) as HTMLButtonElement;
    expect(reset).not.toBeNull();
    expect(reset.textContent?.trim()).toBe('');
    expect(reset.querySelector('ng-icon')).not.toBeNull();

    reset.click();
    await fixture.whenStable();
    expect(store.isFiltering()).toBe(false);
    expect(
      compiled.querySelector('button[aria-label="Reset filter"]'),
    ).toBeNull();
  });

  it('narrows the journal when a Tag is picked and reports n of m', async () => {
    const { fixture, store } = await harness();
    (fixture.componentInstance as unknown as { onTagChange: (e: { value: string }) => void }).onTagChange({
      value: 'FOMC',
    });
    await fixture.whenStable();
    expect(store.filter().tag).toBe('FOMC');
    expect(store.filteredTrades().length).toBe(1);
    expect(store.isFiltering()).toBe(true);
  });

  it('resets the global filter', async () => {
    const { fixture, store } = await harness();
    store.setFilter({ asset: 'fomc' });
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(
      compiled.querySelector('button[aria-label="Reset filter"]'),
    ).not.toBeNull();
    (fixture.componentInstance as unknown as { reset: () => void }).reset();
    await fixture.whenStable();
    expect(store.isFiltering()).toBe(false);
    expect(store.filteredTrades().length).toBe(2);
  });

  it('writes the Grade axis to the global filter and narrows the journal', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    store.addTrade(tradeInput({ asset: 'A-GRADE', grade: 'A', closedAt: '2026-10-02T14:30:00.000Z' }));
    store.addTrade(tradeInput({ asset: 'C-GRADE', grade: 'C', closedAt: '2026-10-02T14:30:00.000Z' }));
    const fixture = TestBed.createComponent(FilterBar);
    await fixture.whenStable();
    (fixture.componentInstance as unknown as { onGradeChange: (e: { value: string }) => void }).onGradeChange({ value: 'C' });
    await fixture.whenStable();
    expect(store.filter().grade).toBe('C');
    expect(store.filteredTrades().map((t) => t.asset)).toEqual(['C-GRADE']);
    expect(store.isFiltering()).toBe(true);
  });

  it('toggles the Needs review axis on the global filter', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    store.addTrade(tradeInput({ asset: 'A-GRADE', grade: 'A', closedAt: '2026-10-02T14:30:00.000Z' }));
    store.addTrade(tradeInput({ asset: 'D-GRADE', grade: 'D', closedAt: '2026-10-02T14:30:00.000Z' }));
    const fixture = TestBed.createComponent(FilterBar);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const toggle = compiled.querySelector(
      '#filter-needs-review',
    ) as HTMLInputElement;
    expect(toggle.checked).toBe(false);
    toggle.click();
    await fixture.whenStable();
    expect(store.filter().needsReview).toBe(true);
    expect(store.isFiltering()).toBe(true);
    expect(store.filteredTrades().map((t) => t.asset)).toEqual(['D-GRADE']);
    expect(toggle.checked).toBe(true);
    toggle.click();
    await fixture.whenStable();
    expect(store.filter().needsReview).toBe(false);
    expect(store.filteredTrades().length).toBe(2);
  });
});
