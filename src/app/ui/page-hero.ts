import { Component, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowDownUp,
  lucideCalendarDays,
  lucideChartLine,
} from '@ng-icons/lucide';

@Component({
  imports: [NgIcon],
  providers: [
    provideIcons({ lucideArrowDownUp, lucideCalendarDays, lucideChartLine }),
  ],
  selector: 'app-page-hero',
  templateUrl: './page-hero.html',
})
export class PageHero {
  readonly title = input.required<string>();
  readonly subtitle = input('');
  readonly icon = input('');
  readonly eyebrow = input('');
}
