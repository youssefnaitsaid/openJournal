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
});
