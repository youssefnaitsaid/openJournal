import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
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

  it('should render navigation to all three routes', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const links = [...compiled.querySelectorAll('nav a')].map((a) =>
      a.getAttribute('href'),
    );
    expect(links).toContain('/dashboard');
    expect(links).toContain('/trades');
    expect(links).toContain('/journal');
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
});
