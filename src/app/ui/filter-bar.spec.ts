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

  it('renders all six filter axes', async () => {
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
    ]) {
      expect(compiled.textContent).toContain(label);
    }
  });

  it('narrows the journal when a Tag is picked and reports n of m', async () => {
    const { fixture, store } = await harness();
    const compiled = fixture.nativeElement as HTMLElement;
    const select = compiled.querySelector(
      'select[aria-label="Tag filter"]',
    ) as HTMLSelectElement;
    select.value = 'FOMC';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(store.filter().tag).toBe('FOMC');
    expect(store.filteredTrades().length).toBe(1);
    expect(compiled.textContent).toContain('1 of 2');
  });

  it('resets the global filter', async () => {
    const { fixture, store } = await harness();
    store.setFilter({ asset: 'fomc' });
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    (
      compiled.querySelector('button[aria-label="Reset filter"]') as HTMLButtonElement
    ).click();
    await fixture.whenStable();
    expect(store.isFiltering()).toBe(false);
    expect(store.filteredTrades().length).toBe(2);
  });
});
