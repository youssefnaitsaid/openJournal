import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { ALL_PORTFOLIOS_ID } from './portfolios';
import { TradesStore } from './features/trades/trades-store';
import { tradeInput } from './features/trades/trade-fixtures';

describe('App', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render navigation to every route including /settings', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const links = [...compiled.querySelectorAll('a[href]')].map((a) =>
      a.getAttribute('href'),
    );
    expect(links).toContain('/dashboard');
    expect(links).toContain('/trades');
    expect(links).toContain('/journal');
    expect(links).toContain('/analytics');
    expect(links).toContain('/settings');
  });

  it('keeps app identity in the rail and the header mobile-only', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const rail = compiled.querySelector('aside');
    expect(rail?.textContent).toContain('openJournal');
    expect(
      rail?.querySelector('button[aria-label="Toggle dark mode"]'),
    ).not.toBeNull();
    expect(
      compiled.querySelector('header')?.classList.contains('lg:hidden'),
    ).toBe(true);
  });

  it('should toggle dark mode from the shell', async () => {
    localStorage.removeItem('openjournal-theme-dark');
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const toggle = compiled.querySelector(
      'aside button[aria-label="Toggle dark mode"]',
    ) as HTMLButtonElement;
    expect(toggle).not.toBeNull();
    const before = document.documentElement.classList.contains('dark');
    toggle.click();
    await fixture.whenStable();
    expect(document.documentElement.classList.contains('dark')).toBe(!before);
  });

  it('should open and close the navigation drawer', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const toggle = compiled.querySelector(
      'button[aria-label="Toggle navigation"]',
    ) as HTMLButtonElement;
    expect(toggle).not.toBeNull();
    toggle.click();
    await fixture.whenStable();
    expect(
      compiled.querySelector('[aria-label="Close navigation"]'),
    ).not.toBeNull();
  });

  it('pins the Portfolio switcher and full Net P&L in the desktop rail footer', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    store.addTrade(
      tradeInput({ asset: 'MES', quantity: 2, entryPrice: 5000, exitPrice: 5010 }),
    );
    // A filter narrows the working views but never the rail's full-Portfolio Net.
    store.setFilter({ asset: 'AAPL' });
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const rail = compiled.querySelector('aside');
    const nav = rail?.querySelector('nav[aria-label="Primary"]');
    const footer = rail?.querySelector('footer');
    expect(nav).not.toBeNull();
    expect(footer).not.toBeNull();
    expect(nav!.contains(footer!)).toBe(false);
    expect(footer!.querySelector('p-select')).not.toBeNull();
    expect(footer!.textContent).toContain('Net P&L');
    expect(footer!.textContent).toContain('+$20.00');
  });

  it('shows the All aggregate Net P&L in the footer and stays read-only', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    store.addTrade(
      tradeInput({ asset: 'MES', quantity: 2, entryPrice: 5000, exitPrice: 5010 }),
    );
    expect(store.addPortfolio('Swing')).toBeNull();
    const swing = store.portfolios().find((p) => p.name === 'Swing')!;
    store.setActiveId(swing.id);
    store.addTrade(
      tradeInput({ asset: 'AAPL', quantity: 1, entryPrice: 100, exitPrice: 95 }),
    );
    store.setActiveId(ALL_PORTFOLIOS_ID);
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const footer = (fixture.nativeElement as HTMLElement).querySelector(
      'aside footer',
    );
    expect(footer!.textContent).toContain('+$15.00');
    expect(footer!.querySelectorAll('p-select')).toHaveLength(1);
  });

  it('mirrors the nav groups, Portfolio switcher, and Net P&L in the mobile drawer', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    store.addTrade(
      tradeInput({ asset: 'MES', quantity: 2, entryPrice: 5000, exitPrice: 5010 }),
    );
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    (
      compiled.querySelector(
        'button[aria-label="Toggle navigation"]',
      ) as HTMLButtonElement
    ).click();
    await fixture.whenStable();
    const mobileNav = document.querySelector(
      'nav[aria-label="Primary mobile"]',
    ) as HTMLElement | null;
    expect(mobileNav).not.toBeNull();
    const mobilePanel = mobileNav!.parentElement as HTMLElement;
    const content = mobilePanel.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(content).toContain('Overview');
    expect(content).toContain('Workspace');
    expect(content).toContain('Configuration');
    expect(mobilePanel.querySelector('p-select')).not.toBeNull();
    expect(
      mobilePanel.querySelector('footer[aria-label="Portfolio scope mobile"]'),
    ).not.toBeNull();
    expect(content).toContain('Net P&L');
    expect(content).toContain('+$20.00');
  });

  it('keeps the mobile toolbar to app identity, the menu trigger, and the theme toggle', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const header = compiled.querySelector('header') as HTMLElement;
    expect(header.querySelector('p-select')).toBeNull();
    expect(header.querySelector('p-tag')).toBeNull();
    expect(header.textContent).toContain('openJournal');
    expect(
      header.querySelector('button[aria-label="Toggle navigation"]'),
    ).not.toBeNull();
    expect(
      header.querySelector('button[aria-label="Toggle dark mode"]'),
    ).not.toBeNull();
    expect(header.textContent).not.toContain('Net P&L');
  });

  it('keeps the three nav groups and marks the active route with aria-current', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/dashboard');
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const nav = compiled.querySelector('aside nav[aria-label="Primary"]');
    const groups = [...nav!.querySelectorAll('p')]
      .map((label) => label.textContent?.trim())
      .filter((label) => label === 'Overview' || label === 'Workspace' || label === 'Configuration');
    expect(groups).toEqual(['Overview', 'Workspace', 'Configuration']);
    const current = nav!.querySelector('a[aria-current="page"]');
    expect(current?.getAttribute('href')).toBe('/dashboard');
  });

  it('should switch the active portfolio from the sidebar and persist it', async () => {
    const store = TestBed.inject(TradesStore);
    await store.whenReady();
    store.addTrade({ ...tradeInput({ asset: 'MES' }) });
    expect(store.addPortfolio('Swing')).toBeNull();
    const swing = store.portfolios().find((p) => p.name === 'Swing')!;
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const select = compiled.querySelector('p-select');
    expect(select).not.toBeNull();
    (fixture.componentInstance as unknown as { onSelectActive: (e: { value: string }) => void }).onSelectActive({
      value: swing.id,
    });
    await fixture.whenStable();
    expect(store.activeId()).toBe(swing.id);
    expect(localStorage.getItem('openjournal-active-portfolio')).toBe(swing.id);
  });
});
