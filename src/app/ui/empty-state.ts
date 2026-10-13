import { Component, input, output } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideInbox, lucidePlus } from '@ng-icons/lucide';

@Component({
  imports: [NgIcon],
  providers: [provideIcons({ lucideInbox, lucidePlus })],
  selector: 'app-empty-state',
  templateUrl: './empty-state.html',
})
export class EmptyState {
  readonly icon = input.required<string>();
  readonly title = input.required<string>();
  readonly description = input('');
  readonly actionLabel = input('');
  readonly actionIcon = input('lucidePlus');
  readonly action = output<void>();
}
