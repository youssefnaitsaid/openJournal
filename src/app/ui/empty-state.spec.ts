import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { EmptyState } from './empty-state';

@Component({
  imports: [EmptyState],
  selector: 'app-empty-state-host',
  template: `<app-empty-state
    icon="lucideInbox"
    title="No trades yet"
    description="Log your first trade above."
    actionLabel="Log trade"
    (action)="onAction()"
  />`,
})
class ActionHost {
  actionCount = 0;
  onAction(): void {
    this.actionCount += 1;
  }
}

@Component({
  imports: [EmptyState],
  selector: 'app-empty-state-plain-host',
  template: `<app-empty-state icon="lucideInbox" title="No trades yet" />`,
})
class PlainHost {}

@Component({
  imports: [EmptyState],
  selector: 'app-empty-state-embedded-host',
  template: `<app-empty-state
    icon="lucideInbox"
    title="No trades yet"
    description="Log a Trade to fill this card."
    [headingLevel]="2"
    [embedded]="true"
  />`,
})
class EmbeddedHost {}

@Component({
  imports: [EmptyState],
  selector: 'app-empty-state-panel-host',
  template: `<app-empty-state
    icon="lucideInbox"
    title="No trades yet"
    description="Log your first Trade to begin."
    actionLabel="Log your first Trade"
    [headingLevel]="2"
    layout="panel"
    (action)="onAction()"
  >
    <figure data-empty-preview>Page schematic</figure>
    <p data-empty-secondary>Then review the month or configure Playbooks.</p>
  </app-empty-state>`,
})
class PanelHost {
  actionCount = 0;
  onAction(): void {
    this.actionCount += 1;
  }
}

@Component({
  imports: [EmptyState],
  selector: 'app-empty-state-panel-embedded-host',
  template: `<app-empty-state
    icon="lucideInbox"
    title="No trades yet"
    [embedded]="true"
    layout="panel"
  >
    <figure data-empty-preview>Page schematic</figure>
  </app-empty-state>`,
})
class PanelEmbeddedHost {}

describe('EmptyState', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('renders the title and description', async () => {
    const fixture = TestBed.createComponent(ActionHost);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('No trades yet');
    expect(compiled.textContent).toContain('Log your first trade above.');
  });

  it('emits an action when the call to action is clicked', async () => {
    const fixture = TestBed.createComponent(ActionHost);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const button = compiled.querySelector('button');
    expect(button?.textContent).toContain('Log trade');
    button?.click();
    expect(fixture.componentInstance.actionCount).toBe(1);
  });

  it('shows no button without an action label', async () => {
    const fixture = TestBed.createComponent(PlainHost);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('button')).toBeNull();
  });

  it('uses the requested heading level', async () => {
    const fixture = TestBed.createComponent(EmbeddedHost);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h2')?.textContent).toContain('No trades yet');
    expect(compiled.querySelector('h3')).toBeNull();
  });

  it('drops the card wrapper when embedded in a card', async () => {
    const fixture = TestBed.createComponent(EmbeddedHost);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('p-card')).toBeNull();
    expect(compiled.textContent).toContain('Log a Trade to fill this card.');
  });

  it('projects a page schematic and secondary path into the panel layout', async () => {
    const fixture = TestBed.createComponent(PanelHost);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('p-card')).not.toBeNull();
    expect(compiled.querySelector('h2')?.textContent).toContain('No trades yet');
    expect(compiled.querySelector('[data-empty-preview]')?.textContent).toContain('Page schematic');
    expect(compiled.querySelector('[data-empty-secondary]')?.textContent).toContain(
      'review the month',
    );
    const button = compiled.querySelector('button');
    expect(button?.textContent).toContain('Log your first Trade');
    button?.click();
    expect(fixture.componentInstance.actionCount).toBe(1);
  });

  it('keeps the panel card-less when embedded and honors its heading level', async () => {
    const fixture = TestBed.createComponent(PanelEmbeddedHost);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('p-card')).toBeNull();
    expect(compiled.querySelector('h3')?.textContent).toContain('No trades yet');
    expect(compiled.querySelector('[data-empty-preview]')?.textContent).toContain('Page schematic');
  });
});
