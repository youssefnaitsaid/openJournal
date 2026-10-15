import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { Journal } from './journal';
import { DEFAULT_PORTFOLIO_ID } from '../../portfolios';
import { TradesStore } from '../trades/trades-store';
import { tradeInput } from '../trades/trade-fixtures';
import { UNSET_GUARDS } from '../../guards';

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

  it('shows flat days with Trades as neutral zero instead of hiding them', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    store.addTrade(
      tradeInput({
        asset: 'FLAT',
        exitPrice: 100,
        fees: 0,
        closedAt: '2026-10-05T14:30:00.000Z',
      }),
    );
    const fixture = TestBed.createComponent(Journal);
    october(fixture);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const cells = [...compiled.querySelectorAll('[role="grid"] button')].map(
      (b) => ({
        day: (b as HTMLElement).textContent?.slice(0, 2),
        net: (b as HTMLElement).querySelector('.font-medium')?.textContent ?? null,
      }),
    );
    expect(cells.find((c) => c.day === '05')?.net).toBe('0');
    expect(cells.find((c) => c.day === '02')?.net).toBeNull();
  });

  it('renders the month report card with metrics and copy control', async () => {
    await seed();
    const fixture = TestBed.createComponent(Journal);
    october(fixture);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const content = compiled.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(content).toContain('Month report card');
    expect(content).toContain('Total Trades');
    expect(content).toContain('Net P&L');
    expect(content).toContain('Win-rate');
    expect(content).toContain('Profit Factor');
    expect(content).toContain('Best Setup');
    expect(content).toContain('Worst Setup');
    expect(content).toContain('Top Mistake');
    expect(content).toContain('Compliance');
    expect(
      compiled.querySelector('[aria-label="Copy month report card"]'),
    ).not.toBeNull();
  });

  it('keeps the report card on full-month data while filtering', async () => {
    await seed();
    const fixture = TestBed.createComponent(Journal);
    const component = fixture.componentInstance;
    october(fixture);
    await fixture.whenStable();
    component.store.setFilter({ asset: 'ZZZ-no-match' });
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const card = compiled
      .querySelector('[aria-label="Month report card"]')
      ?.textContent?.replace(/\s+/g, ' ');
    expect(card).toContain('Trades: 2');
  });

  it('navigates the report card with the month cursor', async () => {
    await seed();
    const fixture = TestBed.createComponent(Journal);
    const component = fixture.componentInstance;
    october(fixture);
    await fixture.whenStable();
    component.next();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const card = compiled
      .querySelector('[aria-label="Month report card"]')
      ?.textContent?.replace(/\s+/g, ' ');
    expect(card).toContain('Trades: 0');
  });

  it('marks Guard-breached days and inside days on the heatmap', async () => {
    await seed();
    const store = TestBed.inject(TradesStore);
    store.setActiveId(DEFAULT_PORTFOLIO_ID);
    store.saveActiveGuards({
      daily: { maxLoss: 100, maxTrades: null, stopTime: null },
      weekly: { ...UNSET_GUARDS.weekly },
    });
    const fixture = TestBed.createComponent(Journal);
    october(fixture);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const content = compiled.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(content).toContain('Guard breached');
    expect(content).toContain('Inside Guards');
  });

  it('shows no Guard markers when every Guard is unset', async () => {
    await seed();
    const fixture = TestBed.createComponent(Journal);
    october(fixture);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const content = compiled.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(content).not.toContain('Guard breached');
    expect(content).not.toContain('Inside Guards');
  });

  it('names breached daily and containing-week Guards in day detail', async () => {
    await seed();
    const store = TestBed.inject(TradesStore);
    store.setActiveId(DEFAULT_PORTFOLIO_ID);
    store.saveActiveGuards({
      daily: { maxLoss: 100, maxTrades: null, stopTime: null },
      weekly: { maxLoss: null, maxTrades: 1 },
    });
    const fixture = TestBed.createComponent(Journal);
    const component = fixture.componentInstance;
    october(fixture);
    component.selectedDay.set('2026-10-03');
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const content = compiled.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(content).toContain('Daily loss Guard');
    expect(content).toContain('Weekly trade count Guard');
  });

  it('copies the card markdown to the clipboard with confirmation', async () => {
    await seed();
    const fixture = TestBed.createComponent(Journal);
    october(fixture);
    await fixture.whenStable();
    const written: string[] = [];
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: (text: string) => { written.push(text); return Promise.resolve(); } },
      configurable: true,
    });
    const compiled = fixture.nativeElement as HTMLElement;
    (
      compiled.querySelector('[aria-label="Copy month report card"]') as HTMLButtonElement
    ).click();
    await fixture.whenStable();
    expect(written).toEqual([
      [
        'OpenJournal — 2026-10 report card',
        'Trades: 2 · Net: -$6.00 · Win-rate: 50.00% · PF: 0.94',
        'Best Setup: Breakout (+$99.00) · Worst Setup: Opening-drive (-$105.00)',
        'Top Mistake: None-followed-plan ×1 · Compliance: — (0/2 scored)',
      ].join('\n'),
    ]);
    expect(
      compiled.querySelector('[aria-label="Copy month report card"]')?.textContent,
    ).toContain('Copied');
  });

  it('scopes the calendar to the active portfolio only', async () => {
    await seed();
    const store = TestBed.inject(TradesStore);
    store.addPortfolio('Swing');
    store.setActiveId(store.portfolios().find((p) => p.name === 'Swing')!.id);
    const fixture = TestBed.createComponent(Journal);
    october(fixture);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const content = compiled.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(content).toContain('No trades this day');
    expect(content).not.toContain('-105');
  });
});
