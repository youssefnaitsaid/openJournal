import { Location } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '../../app.routes';
import { Settings } from './settings';
import { TradesStore } from '../trades/trades-store';
import { tradeInput } from '../trades/trade-fixtures';
import {
  ALL_PORTFOLIOS_ID,
  DEFAULT_PORTFOLIO_ID,
  PORTFOLIOS_STORAGE_KEY,
} from '../../portfolios';
import { GUARDS_STORAGE_KEY } from '../../guards';

describe('Settings', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [Settings],
      providers: [provideRouter(routes)],
    });
  });

  it('resolves as a titled /settings route while unknown paths redirect to /dashboard', async () => {
    const router = TestBed.inject(Router);
    const location = TestBed.inject(Location);
    await router.navigateByUrl('/settings');
    expect(location.path()).toBe('/settings');
    expect(TestBed.inject(Title).getTitle()).toBe('Settings');
    await router.navigateByUrl('/nope');
    expect(location.path()).toBe('/dashboard');
  });

  it('renders Portfolios, Guards, Vocabulary, and Playbooks as stacked sections on one page', async () => {
    const fixture = TestBed.createComponent(Settings);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const content = compiled.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(content).toContain('Portfolios');
    expect(content).toContain('Guards');
    expect(content).toContain('Vocabulary');
    expect(content).toContain('Playbooks');
    const headings = [...compiled.querySelectorAll('h2')].map((h) =>
      h.textContent?.trim(),
    );
    expect(headings).toEqual(['Portfolios', 'Guards', 'Vocabulary', 'Playbooks']);
  });

  it('creates a Portfolio and rejects a duplicate name', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    const fixture = TestBed.createComponent(Settings);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const component = fixture.componentInstance;

    component.onNewPortfolioName('Main');
    component.createPortfolio();
    await fixture.whenStable();
    expect(compiled.textContent).toContain('Portfolio "Main" already exists.');

    component.onNewPortfolioName('Funded');
    component.createPortfolio();
    await fixture.whenStable();
    expect(store.portfolios().map((p) => p.name)).toContain('Funded');
    expect(localStorage.getItem(PORTFOLIOS_STORAGE_KEY)).toContain('Funded');
  });

  it('renames a Portfolio by name', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    const fixture = TestBed.createComponent(Settings);
    const component = fixture.componentInstance;
    await fixture.whenStable();
    const main = store.portfolios().find((p) => p.id === DEFAULT_PORTFOLIO_ID)!;

    component.startRename(main.id);
    component.onRenameValue('Renamed');
    component.commitRename();
    await fixture.whenStable();
    expect(store.portfolios().map((p) => p.name)).toContain('Renamed');
    expect(localStorage.getItem(PORTFOLIOS_STORAGE_KEY)).toContain('Renamed');
  });

  it('edits each starting balance once in the Portfolios card and persists it', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    expect(store.addPortfolio('Funded')).toBeNull();
    const funded = store.portfolios().find((p) => p.name === 'Funded')!;
    const fixture = TestBed.createComponent(Settings);
    const component = fixture.componentInstance;
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const portfoliosCard = compiled.querySelector('[aria-label="Portfolios"]')!;
    const editors = [...portfoliosCard.querySelectorAll('p-inputnumber')];
    expect(editors.map((editor) => editor.getAttribute('aria-label'))).toEqual([
      'Starting balance for Main',
      'Starting balance for Funded',
    ]);

    component.onPortfolioBalance(DEFAULT_PORTFOLIO_ID, 20000);
    component.onPortfolioBalance(funded.id, 5000);
    await fixture.whenStable();
    expect(store.portfolios().find((p) => p.id === DEFAULT_PORTFOLIO_ID)!.startingBalance).toBe(20000);
    expect(store.portfolios().find((p) => p.name === 'Funded')!.startingBalance).toBe(5000);
    const saved = JSON.parse(
      localStorage.getItem(PORTFOLIOS_STORAGE_KEY) ?? '[]',
    ) as { startingBalance: number }[];
    expect(saved.map((p) => p.startingBalance)).toEqual([20000, 5000]);
  });

  it('shows the summed All anchor once, read-only, and keeps it in sync with balance edits', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    expect(store.addPortfolio('Funded')).toBeNull();
    const fixture = TestBed.createComponent(Settings);
    const component = fixture.componentInstance;
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const anchors = compiled.querySelectorAll('[aria-label="All starting balance"]');
    expect(anchors.length).toBe(1);
    const anchor = anchors[0] as HTMLElement;
    expect(compiled.querySelector('[aria-label="Portfolios"]')!.contains(anchor)).toBe(true);
    expect(anchor.textContent).toContain('$20,000.00');
    expect(anchor.querySelector('input')).toBeNull();

    component.onPortfolioBalance(DEFAULT_PORTFOLIO_ID, 25000);
    await fixture.whenStable();
    expect(anchor.textContent).toContain('$35,000.00');
  });

  it('deletes a Portfolio only after confirm-dialog acceptance', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    expect(store.addPortfolio('Doomed')).toBeNull();
    const doomed = store.portfolios().find((p) => p.name === 'Doomed')!;
    store.setActiveId(doomed.id);
    store.addTrade({ ...tradeInput({ asset: 'DOOMED' }) });
    const fixture = TestBed.createComponent(Settings);
    const component = fixture.componentInstance;
    await fixture.whenStable();

    component.requestDelete(doomed.id);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.querySelector('p-confirmdialog')).not.toBeNull();
    const message = document.querySelector('.p-confirmdialog-message');
    expect(message?.textContent).toContain('Delete "Doomed" plus its Trades?');
    const accept = document.querySelector<HTMLButtonElement>(
      '.p-confirmdialog-accept-button',
    );
    expect(accept).not.toBeNull();
    accept!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(store.portfolios().map((p) => p.name)).toEqual(['Main']);
    expect(store.trades().length).toBe(0);
  });

  it('keeps at least one Portfolio', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    const fixture = TestBed.createComponent(Settings);
    const component = fixture.componentInstance;
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    component.requestDelete(DEFAULT_PORTFOLIO_ID);
    fixture.detectChanges();
    await fixture.whenStable();
    const accept = document.querySelector<HTMLButtonElement>(
      '.p-confirmdialog-accept-button',
    );
    accept?.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(compiled.textContent).toContain('At least one Portfolio must remain.');
    expect(store.portfolios().length).toBe(1);
  });

  it('keeps starting balance out of Guards while editing the active Portfolio daily and weekly limits', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    store.addTrade(tradeInput({ asset: 'AAPL' }));
    store.setActiveId(DEFAULT_PORTFOLIO_ID);
    const fixture = TestBed.createComponent(Settings);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    const guardsCard = compiled.querySelector('[aria-label="Guards"]')!;
    expect(guardsCard.textContent).not.toContain('Starting balance');
    expect(
      guardsCard.querySelector('[aria-label="Active portfolio starting balance"]'),
    ).toBeNull();

    fixture.componentInstance.onGuardNumber('dailyMaxLoss', 200);
    fixture.componentInstance.onGuardNumber('weeklyMaxLoss', 500);
    fixture.componentInstance.onGuardNumber('weeklyMaxTrades', 5);
    await fixture.whenStable();
    const saved = store.guardMap()[DEFAULT_PORTFOLIO_ID];
    expect(saved?.daily.maxLoss).toBe(200);
    expect(saved?.weekly.maxLoss).toBe(500);
    expect(saved?.weekly.maxTrades).toBe(5);
    expect(localStorage.getItem(GUARDS_STORAGE_KEY)).toContain('200');
  });

  it('rejects an invalid Guard and names it', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    store.setActiveId(DEFAULT_PORTFOLIO_ID);
    const fixture = TestBed.createComponent(Settings);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    fixture.componentInstance.onGuardNumber('dailyMaxLoss', -50);
    await fixture.whenStable();
    expect(compiled.textContent).toContain(
      'Daily loss Guard must be a positive amount',
    );
  });

  it('reports this-week Guard status on full-journal truth', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    store.addTrade(
      tradeInput({
        asset: 'WEEK-LOSS',
        exitPrice: 90,
        fees: 5,
        closedAt: new Date().toISOString(),
      }),
    );
    store.setActiveId(DEFAULT_PORTFOLIO_ID);
    store.saveActiveGuards({
      daily: { maxLoss: null, maxTrades: null, stopTime: null },
      weekly: { maxLoss: 100, maxTrades: null },
    });
    const fixture = TestBed.createComponent(Settings);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Weekly loss Guard');
  });

  it('replaces Guard inputs with one quiet per-Portfolio state and no Guard status while All is active', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    store.setActiveId(DEFAULT_PORTFOLIO_ID);
    store.addTrade(tradeInput({ asset: 'AAPL' }));
    store.saveActiveGuards({
      daily: { maxLoss: 100, maxTrades: null, stopTime: null },
      weekly: { maxLoss: 500, maxTrades: null },
    });
    store.setActiveId(ALL_PORTFOLIOS_ID);
    expect(store.isAll()).toBe(true);
    const fixture = TestBed.createComponent(Settings);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    const guardsCard = compiled.querySelector('[aria-label="Guards"]')!;
    const guardsText = guardsCard.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(guardsText).toContain('Guards are set per Portfolio — select one');
    expect(guardsCard.querySelectorAll('input, select, textarea').length).toBe(0);
    expect(guardsText).not.toContain('This week');
    expect(guardsText).not.toContain('No Guards set');
    expect(compiled.querySelectorAll('[aria-label="All starting balance"]').length).toBe(1);
  });

  it('adds Setup, Emotion, Mistake, and Tag vocabulary and persists it', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    const fixture = TestBed.createComponent(Settings);
    await fixture.whenStable();
    const component = fixture.componentInstance;

    component.addVocabulary('setup', 'Opening-drive');
    component.addVocabulary('emotion', 'Fear');
    component.addVocabulary('mistake', 'Chased-entry');
    component.addVocabulary('tag', 'FOMC, earnings');
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const vocab =
      compiled.querySelector('[aria-label="Vocabulary"]')?.textContent ?? '';
    expect(vocab).toContain('Opening-drive');
    expect(vocab).toContain('Fear');
    expect(vocab).toContain('Chased-entry');
    expect(vocab).toContain('FOMC');
    expect(vocab).toContain('earnings');
    const saved = JSON.parse(
      localStorage.getItem('openjournal-taxonomy') ?? '{}',
    ) as Record<string, string[]>;
    expect(saved['setup']).toContain('Opening-drive');
    expect(saved['emotion']).toContain('Fear');
    expect(saved['mistake']).toContain('Chased-entry');
    expect(saved['tag']).toContain('FOMC');
    expect(saved['tag']).toContain('earnings');
  });

  it('ignores blank and duplicate vocabulary values', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    const fixture = TestBed.createComponent(Settings);
    await fixture.whenStable();
    const component = fixture.componentInstance;

    component.addVocabulary('emotion', '   ');
    component.addVocabulary('emotion', 'Fear');
    component.addVocabulary('emotion', 'Fear');
    await fixture.whenStable();

    const saved = JSON.parse(
      localStorage.getItem('openjournal-taxonomy') ?? '{}',
    ) as { emotion?: string[] };
    expect(saved.emotion).toEqual(['Fear']);
  });

  it('adds Rules to a Playbook and persists them', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    const fixture = TestBed.createComponent(Settings);
    await fixture.whenStable();
    const component = fixture.componentInstance;

    component.addPlaybookRule('Breakout', 'risk ≤ 1%');
    component.addPlaybookRule('Breakout', 'entry on retest');
    await fixture.whenStable();

    const saved = JSON.parse(
      localStorage.getItem('openjournal-taxonomy') ?? '{}',
    ) as { playbooks?: Record<string, { rules: string[] }> };
    expect(saved.playbooks?.['Breakout']?.rules).toEqual([
      'risk ≤ 1%',
      'entry on retest',
    ]);
    const compiled = fixture.nativeElement as HTMLElement;
    const playbooks =
      compiled.querySelector('[aria-label="Playbooks"]')?.textContent ?? '';
    expect(playbooks).toContain('risk ≤ 1%');
    expect(playbooks).toContain('entry on retest');
  });

  it('removes a Rule from a Playbook', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    const fixture = TestBed.createComponent(Settings);
    await fixture.whenStable();
    const component = fixture.componentInstance;

    component.addPlaybookRule('Breakout', 'first');
    component.addPlaybookRule('Breakout', 'second');
    component.removePlaybookRule('Breakout', 0);
    await fixture.whenStable();

    const saved = JSON.parse(
      localStorage.getItem('openjournal-taxonomy') ?? '{}',
    ) as { playbooks?: Record<string, { rules: string[] }> };
    expect(saved.playbooks?.['Breakout']?.rules).toEqual(['second']);
  });

  it('archiving a Playbook moves it out of the active list and back', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    const fixture = TestBed.createComponent(Settings);
    await fixture.whenStable();
    const component = fixture.componentInstance;

    expect(component.activePlaybooks().map((p) => p.name)).toContain('Breakout');
    component.archivePlaybook('Breakout');
    await fixture.whenStable();
    expect(component.activePlaybooks().map((p) => p.name)).not.toContain('Breakout');
    expect(component.archivedPlaybooks().map((p) => p.name)).toContain('Breakout');
    const saved = JSON.parse(
      localStorage.getItem('openjournal-taxonomy') ?? '{}',
    ) as { playbooks?: Record<string, { archived: boolean }> };
    expect(saved.playbooks?.['Breakout']?.archived).toBe(true);

    component.unarchivePlaybook('Breakout');
    await fixture.whenStable();
    expect(component.archivedPlaybooks().map((p) => p.name)).not.toContain('Breakout');
    expect(component.activePlaybooks().map((p) => p.name)).toContain('Breakout');
  });
});
