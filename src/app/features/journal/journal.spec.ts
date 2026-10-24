import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { Journal } from './journal';
import { DEFAULT_PORTFOLIO_ID } from '../../portfolios';
import { TradesStore } from '../trades/trades-store';
import { tradeInput } from '../trades/trade-fixtures';
import { UNSET_GUARDS } from '../../guards';

describe('Journal', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
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
    expect(content).toContain('-$105.00');
  });

  it('opens on the latest close day of the shown month', async () => {
    await seed();
    const fixture = TestBed.createComponent(Journal);
    october(fixture);
    await fixture.whenStable();
    const component = fixture.componentInstance;
    const compiled = fixture.nativeElement as HTMLElement;
    expect(component.activeDay()).toBe('2026-10-03');
    const dayDetail = compiled.querySelector(
      '[aria-label="Day detail"]',
    ) as HTMLElement;
    expect(dayDetail.textContent).toContain('TSLA');
  });

  it('shows the selected day exact Net beside the day label', async () => {
    await seed();
    const fixture = TestBed.createComponent(Journal);
    const component = fixture.componentInstance;
    october(fixture);
    component.selectedDay.set('2026-10-03');
    await fixture.whenStable();
    expect(component.activeDayNet()).toBe(-105);
    const compiled = fixture.nativeElement as HTMLElement;
    const header = compiled.querySelector('[aria-label="Day detail"] > div');
    expect(header?.textContent).toContain('-$105.00');
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

  it('renders the selected day exactly once: one table, no parallel card list', async () => {
    await seed();
    const fixture = TestBed.createComponent(Journal);
    const component = fixture.componentInstance;
    october(fixture);
    component.selectedDay.set('2026-10-01');
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const dayDetail = compiled.querySelector(
      '[aria-label="Day detail"]',
    ) as HTMLElement;
    expect(dayDetail).not.toBeNull();
    expect(dayDetail.querySelectorAll('p-table').length).toBe(1);
    expect(dayDetail.querySelectorAll('p-card').length).toBe(0);
    const aaplCells = [...dayDetail.querySelectorAll('td')].filter((td) =>
      td.textContent?.includes('AAPL'),
    );
    expect(aaplCells.length).toBe(1);
  });

  it('row expansion reveals notes, Emotion, Mistake, and the Playbook snapshot', async () => {
    await seed();
    const store = TestBed.inject(TradesStore);
    store.addTrade({
      ...tradeInput({
        asset: 'SNAP',
        exitPrice: 105,
        notes: 'Held to target',
        rules: [
          { text: 'Plan before entry', followed: true },
          { text: 'Stopped at plan', followed: false },
        ],
        chartUrl: 'https://example.com/snap.png',
      }),
    });
    const fixture = TestBed.createComponent(Journal);
    const component = fixture.componentInstance;
    october(fixture);
    component.selectedDay.set('2026-10-01');
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const content = () =>
      compiled.textContent?.replace(/\s+/g, ' ') ?? '';
    // At rest the evidence is folded: notes and snapshot are not rendered.
    expect(content()).not.toContain('Held to target');
    expect(content()).not.toContain('Plan before entry');
    [
      ...compiled.querySelectorAll('[aria-label="Toggle details"]'),
    ].forEach((button) => (button as HTMLButtonElement).click());
    fixture.detectChanges();
    await fixture.whenStable();
    expect(content()).toContain('Held to target');
    expect(content()).toContain('Plan before entry');
    expect(content()).toContain('Stopped at plan');
    expect(content()).toContain('Calm');
    expect(content()).toContain('None-followed-plan');
    expect(
      compiled.querySelector('a[href="https://example.com/snap.png"]'),
    ).not.toBeNull();
  });

  it('shows psychology and evidence for the selected day once its row is expanded', async () => {
    await seed();
    const fixture = TestBed.createComponent(Journal);
    const component = fixture.componentInstance;
    october(fixture);
    component.selectedDay.set('2026-10-01');
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    [
      ...compiled.querySelectorAll('[aria-label="Toggle details"]'),
    ].forEach((button) => (button as HTMLButtonElement).click());
    fixture.detectChanges();
    await fixture.whenStable();
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

  it('states Month Net P&L and month-end balance once inside the Month report card', async () => {
    await seed();
    const fixture = TestBed.createComponent(Journal);
    october(fixture);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const card = compiled.querySelector(
      '[aria-label="Month report card"]',
    ) as HTMLElement;
    expect(card).not.toBeNull();
    const content = card.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(content).toContain('Month Net P&L');
    expect(content).toContain('-$6.00');
    expect(content).toContain('Balance at month end');
    expect(content).toContain('9,994');
    // The headline Net is the report's Net: no second Net metric row.
    const labels = [...card.querySelectorAll('dt')].map(
      (dt) => dt.textContent?.trim() ?? '',
    );
    expect(labels.filter((label) => label === 'Month Net P&L').length).toBe(1);
    expect(labels).not.toContain('Net P&L');
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

  it('prefixes gains with + and leaves day cells untinted', async () => {
    await seed();
    const fixture = TestBed.createComponent(Journal);
    october(fixture);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const content = compiled.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(content).toContain('+$99');
    expect(compiled.querySelector('.oj-win, .oj-loss')).toBeNull();
    const labels = [
      ...compiled.querySelectorAll('[role="grid"] button'),
    ].map((el) => el.getAttribute('aria-label'));
    expect(labels.some((label) => label?.includes('-$105'))).toBe(true);
  });

  it('keeps calendar tags inside a narrow cell while aria labels stay exact', async () => {
    await seed();
    const store = TestBed.inject(TradesStore);
    store.addTrade(
      tradeInput({
        asset: 'BIG',
        exitPrice: 224.65,
        fees: 0,
        closedAt: '2026-10-08T14:30:00.000Z',
      }),
    );
    const fixture = TestBed.createComponent(Journal);
    october(fixture);
    await fixture.whenStable();
    const component = fixture.componentInstance;
    expect(component.dayNetText(648)).toBe('+$648');
    expect(component.dayNetText(-181.2)).toBe('-$181.20');
    expect(component.dayNetText(1246.5)).toBe('+$1,247');
    expect(component.dayNetText(-1003.5)).toBe('-$1,004');
    expect(component.dayNetText(12345.67)).toBe('+$12.3K');
    expect(component.dayNetText(-10000)).toBe('-$10K');
    expect(component.dayNetText(0)).toBe('0');
    const compiled = fixture.nativeElement as HTMLElement;
    const cell = [
      ...compiled.querySelectorAll('[role="grid"] button'),
    ].find((button) =>
      button.getAttribute('aria-label')?.startsWith('Thursday, October 8'),
    );
    expect(cell?.querySelector('p-tag')?.textContent?.trim()).toBe('+$1,247');
    expect(cell?.getAttribute('aria-label')).toContain('+$1,246.50');
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

  it('shows flat days with Trades as a neutral zero instead of hiding them', async () => {
    await seed();
    const store = TestBed.inject(TradesStore);
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
    const cells = [...compiled.querySelectorAll('[role="grid"] button')].map((b) => {
      const el = b as HTMLElement;
      return {
        day: el.querySelector('span')?.textContent?.trim() ?? '',
        net: el.querySelector('p-tag')?.textContent?.trim() ?? null,
        tinted:
          el.classList.contains('oj-win') || el.classList.contains('oj-loss'),
      };
    });
    expect(cells.find((c) => c.day === '5')?.net).toBe('0');
    expect(cells.find((c) => c.day === '5')?.tinted).toBe(false);
    expect(cells.find((c) => c.day === '1')?.net).toBe('+$99');
    expect(cells.find((c) => c.day === '3')?.net).toBe('-$105');
    expect(cells.find((c) => c.day === '2')?.net).toBeNull();
    expect(cells.every((c) => !c.tinted)).toBe(true);
  });

  it('drops leading zeros from calendar day numbers', async () => {
    await seed();
    const fixture = TestBed.createComponent(Journal);
    october(fixture);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const numbers = [
      ...compiled.querySelectorAll('[role="grid"] button'),
    ].map((button) => button.textContent?.trim().match(/^\d+/)?.[0] ?? '');
    expect(numbers).toContain('1');
    expect(numbers).toContain('3');
    expect(numbers).not.toContain('01');
    expect(numbers).not.toContain('05');
    expect(numbers.every((day) => !/^0\d/.test(day))).toBe(true);
  });

  it('renders exactly one Month report card carrying every report metric and Copy', async () => {
    await seed();
    const fixture = TestBed.createComponent(Journal);
    october(fixture);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const cards = compiled.querySelectorAll('[aria-label="Month report card"]');
    expect(cards.length).toBe(1);
    expect(compiled.querySelector('[aria-label="Month summary"]')).toBeNull();
    const card = cards[0] as HTMLElement;
    const content = card.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(content).toContain('Month report card');
    expect(content).toContain('Total Trades');
    expect(content).toContain('Month Net P&L');
    expect(content).toContain('Balance at month end');
    expect(content).toContain('Win-rate');
    expect(content).toContain('Profit Factor');
    expect(content).toContain('Best Setup');
    expect(content).toContain('Worst Setup');
    expect(content).toContain('Top Mistake');
    expect(content).toContain('Compliance');
    expect(
      card.querySelector('[aria-label="Copy month report card"]'),
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
    const card = compiled.querySelector('[aria-label="Month report card"]');
    expect(card).not.toBeNull();
    const metric = [...(card?.querySelectorAll('div') ?? [])].find((el) =>
      el.querySelector('dt')?.textContent?.includes('Total Trades'),
    );
    expect(metric?.querySelector('dd')?.textContent?.trim()).toBe('2');
  });

  it('orders the page calendar-first: calendar, then day detail, then one Month report', async () => {
    await seed();
    const fixture = TestBed.createComponent(Journal);
    const component = fixture.componentInstance;
    october(fixture);
    component.selectedDay.set('2026-10-01');
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const landmarks = [...compiled.querySelectorAll(
      '[aria-label="Month calendar"], [aria-label="Day detail"], [aria-label="Month summary"], [aria-label="Month report card"]',
    )];
    expect(landmarks.length).toBe(3);
    const order = landmarks.map((el) => el.getAttribute('aria-label'));
    expect(order).toEqual([
      'Month calendar',
      'Day detail',
      'Month report card',
    ]);
  });

  it('goes quiet on a month without closes: no summary or report, navigation still works', async () => {
    await seed();
    const fixture = TestBed.createComponent(Journal);
    const component = fixture.componentInstance;
    october(fixture);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(
      compiled.querySelector('[aria-label="Month summary"]'),
    ).toBeNull();
    expect(
      compiled.querySelector('[aria-label="Month report card"]'),
    ).not.toBeNull();
    component.next();
    await fixture.whenStable();
    const content = compiled.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(content).toContain('November 2026');
    expect(compiled.querySelector('[aria-label="Month summary"]')).toBeNull();
    expect(compiled.querySelector('[aria-label="Month report card"]')).toBeNull();
    expect(content).not.toContain('Month Net P&L');
    expect(content).not.toContain('Balance at month end');
    expect(content).not.toContain('Total Trades');
    expect(
      compiled.querySelector('[aria-label="Copy month report card"]'),
    ).toBeNull();
    // Month navigation keeps working on the empty month.
    (
      compiled.querySelector('[aria-label="Previous month"]') as HTMLButtonElement
    ).click();
    await fixture.whenStable();
    expect(
      compiled.querySelector('[aria-label="Current month"]')?.textContent,
    ).toContain('October 2026');
    expect(
      compiled.querySelector('[aria-label="Month report card"]'),
    ).not.toBeNull();
  });

  it('nests the Copy control inside the Month report card', async () => {
    await seed();
    const fixture = TestBed.createComponent(Journal);
    october(fixture);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const card = compiled.querySelector('[aria-label="Month report card"]');
    expect(card).not.toBeNull();
    expect(
      card?.querySelector('[aria-label="Copy month report card"]'),
    ).not.toBeNull();
  });

  it('drives month navigation and copy with lucide icons, not PrimeIcons', async () => {
    await seed();
    const fixture = TestBed.createComponent(Journal);
    october(fixture);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.pi-chevron-left')).toBeNull();
    expect(compiled.querySelector('.pi-chevron-right')).toBeNull();
    expect(compiled.querySelector('.pi-copy')).toBeNull();
    expect(compiled.querySelector('.pi-check')).toBeNull();
    const heroButtons = [
      ...compiled.querySelectorAll(
        'button[aria-label="Previous month"], button[aria-label="Next month"]',
      ),
    ];
    expect(heroButtons.length).toBe(2);
    for (const button of heroButtons) {
      expect(button.querySelector('ng-icon')).not.toBeNull();
    }
    const copyButton = compiled.querySelector(
      '[aria-label="Copy month report card"]',
    );
    expect(copyButton?.querySelector('ng-icon')).not.toBeNull();
  });

  it('keeps the custom calendar on Aura tokens with no shadow semantic tints', async () => {
    await seed();
    const fixture = TestBed.createComponent(Journal);
    const component = fixture.componentInstance;
    october(fixture);
    component.selectedDay.set('2026-10-01');
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    // The shared page hero is not part of this page's template; the journal
    // view itself must stay on Aura surface/primary tokens.
    const clone = compiled.cloneNode(true) as HTMLElement;
    clone.querySelector('app-page-hero')?.remove();
    const markup = clone.innerHTML;
    for (const banned of [
      'sidebar-accent',
      'text-muted-foreground',
      'text-foreground',
      'border-border',
      'text-destructive',
      'text-success',
      'text-warning',
      'animate-fade-in-up',
    ]) {
      expect(markup).not.toContain(banned);
    }
    // Day selection rides the Aura highlight scale; the grid stays custom.
    const selected = compiled.querySelector(
      '[aria-label="Month calendar"] [aria-pressed="true"]',
    );
    expect(selected).not.toBeNull();
    expect(selected?.className).toContain('bg-highlight');
    expect(compiled.querySelector('[role="grid"]')).not.toBeNull();
  });

  it('keeps day cells neutral and flags only the Guard-breached day', async () => {
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
    // The day Net owns the outcome color; the cell stays on surface tokens.
    expect(compiled.querySelector('.oj-win, .oj-loss')).toBeNull();
    // A breached day gets the guard signal in its accessible day label.
    const breachedDays = [
      ...compiled.querySelectorAll('[role="grid"] button'),
    ].filter((button) =>
      button.getAttribute('aria-label')?.includes('Guard breached'),
    );
    expect(breachedDays.length).toBeGreaterThan(0);
    // Inside-Guard days stay silent — no badge text in the grid.
    const grid = compiled.querySelector('[aria-label="Month calendar"]')?.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(grid).not.toContain('Inside Guards');
  });

  it('shows no Guard markers when every Guard is unset', async () => {
    await seed();
    const fixture = TestBed.createComponent(Journal);
    october(fixture);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const breachedDays = [
      ...compiled.querySelectorAll('[role="grid"] button'),
    ].filter((button) =>
      button.getAttribute('aria-label')?.includes('Guard breached'),
    );
    expect(breachedDays).toEqual([]);
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
    // An empty Portfolio gets the onboarding message, not the per-day one.
    expect(content).toContain('No Trades in Swing yet');
    expect(content).not.toContain('No trades this day');
    expect(content).not.toContain('-105');
  });
});
