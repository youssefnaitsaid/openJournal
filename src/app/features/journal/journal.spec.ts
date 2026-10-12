import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { Journal } from './journal';
import { TradesStore } from '../trades/trades-store';
import { tradeInput } from '../trades/trade-fixtures';

describe('Journal', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  async function seed() {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    store.addTrade({
      ...tradeInput({
        asset: 'AAPL',
        exitPrice: 110,
        fees: 1,
        emotionAfter: 'Disciplined',
        chartUrl: 'https://example.com/aapl.png',
        notes: 'Followed plan',
      }),
    });
    store.addTrade({
      ...tradeInput({
        asset: 'TSLA',
        exitPrice: 90,
        fees: 5,
        setup: 'Opening-drive',
        emotionBefore: 'FOMO',
        emotionAfter: 'Frustrated',
        mistake: 'Left-early',
        closedAt: '2026-10-03T14:30:00.000Z',
      }),
    });
  }

  function october(fixture: { componentInstance: Journal }) {
    fixture.componentInstance.cursor.set({ year: 2026, month: 9 });
  }

  it('buckets Trades by close day with day Net', async () => {
    await seed();
    const fixture = TestBed.createComponent(Journal);
    october(fixture);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const content = compiled.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(content).toContain('99');
    expect(content).toContain('-105');
  });

  it('paginates months and returns to this month', async () => {
    await seed();
    const fixture = TestBed.createComponent(Journal);
    october(fixture);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const label = () =>
      compiled.querySelector('[aria-label="Current month"]')?.textContent;
    expect(label()).toContain('October 2026');
    (
      compiled.querySelector('[aria-label="Next month"]') as HTMLButtonElement
    ).click();
    await fixture.whenStable();
    expect(label()).toContain('November 2026');
    (
      compiled.querySelector('[aria-label="This month"]') as HTMLButtonElement
    ).click();
    await fixture.whenStable();
    expect(compiled.querySelector('[aria-label="Current month"]')).not.toBeNull();
  });

  it('shows psychology and evidence for the selected day', async () => {
    await seed();
    const fixture = TestBed.createComponent(Journal);
    const component = fixture.componentInstance;
    october(fixture);
    component.selectedDay.set('2026-10-01');
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const content = compiled.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(content).toContain('Breakout');
    expect(content).toContain('Calm');
    expect(content).toContain('Disciplined');
    expect(content).toContain('None-followed-plan');
    expect(content).toContain('Followed plan');
    const link = compiled.querySelector(
      'a[href="https://example.com/aapl.png"]',
    );
    expect(link).not.toBeNull();
  });

  it('summarises month Net and balance from the shared setting', async () => {
    await seed();
    const fixture = TestBed.createComponent(Journal);
    october(fixture);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const content = compiled.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(content).toContain('-6');
    expect(content).toContain('9994');
  });

  it('renders user-added tag values with no code change', async () => {
    await seed();
    const fixture = TestBed.createComponent(Journal);
    const component = fixture.componentInstance;
    october(fixture);
    component.selectedDay.set('2026-10-03');
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Opening-drive');
  });

  it('styles loss days as destructive and prefixes gains with +', async () => {
    await seed();
    const fixture = TestBed.createComponent(Journal);
    october(fixture);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const content = compiled.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(content).toContain('+99');
    const destructive = [...compiled.querySelectorAll('.text-destructive')].map(
      (el) => el.textContent,
    );
    expect(destructive.some((t) => t?.includes('-105'))).toBe(true);
  });

  it('renders local dates without raw ISO', async () => {
    await seed();
    const fixture = TestBed.createComponent(Journal);
    const component = fixture.componentInstance;
    october(fixture);
    component.selectedDay.set('2026-10-01');
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).not.toContain('T14:30:00.000Z');
    // Day detail must render the close date in local medium format.
    const detail =
      compiled.textContent?.replace(/\s+/g, ' ') ??
      '';
    expect(detail).toMatch(/Oct 1, 2026/);
  });
});
