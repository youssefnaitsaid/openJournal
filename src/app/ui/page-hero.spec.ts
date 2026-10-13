import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { PageHero } from './page-hero';

@Component({
  imports: [PageHero],
  selector: 'app-page-hero-host',
  template: `<app-page-hero title="Trades" subtitle="Log and review" icon="lucideArrowDownUp"><button type="button">Action</button></app-page-hero>`,
})
class PageHeroHost {}

describe('PageHero', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('renders the title, subtitle, and projected actions', async () => {
    const fixture = TestBed.createComponent(PageHeroHost);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Trades');
    expect(compiled.textContent).toContain('Log and review');
    expect(compiled.querySelector('button')?.textContent).toContain('Action');
  });
});
