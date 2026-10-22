import { Component, input, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideInbox } from '@ng-icons/lucide';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';

@Component({
  imports: [NgIcon, NgTemplateOutlet, ButtonModule, CardModule],
  providers: [provideIcons({ lucideInbox })],
  selector: 'app-empty-state',
  templateUrl: './empty-state.html',
})
export class EmptyState {
  readonly icon = input.required<string>();
  readonly title = input.required<string>();
  readonly description = input('');
  readonly actionLabel = input('');
  readonly compact = input(false);
  /** Drop the card wrapper when the state already sits inside a card. */
  readonly embedded = input(false);
  /** Heading level: 2 when the card is a page-level section, 3 when nested under a card heading. */
  readonly headingLevel = input<2 | 3>(3);
  readonly action = output<void>();
}
