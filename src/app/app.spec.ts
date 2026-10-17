import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
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
    expect(links).toContain('/settings');
  });

  it('should render the brand and a sticky header', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('openJournal');
    expect(compiled.querySelector('header')).not.toBeNull();
  });

  it('should toggle dark mode from the header', async () => {
    localStorage.removeItem('openjournal-theme-dark');
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const toggle = compiled.querySelector(
      'button[aria-label="Toggle dark mode"]',
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
