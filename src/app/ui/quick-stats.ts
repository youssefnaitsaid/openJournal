import { Component, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowDownUp,
  lucideCalendarDays,
  lucideChartLine,
  lucideFlame,
  lucideHash,
  lucidePercent,
  lucideTarget,
  lucideTrendingDown,
} from '@ng-icons/lucide';

export interface QuickStat {
  readonly icon: string;
  readonly label: string;
  readonly value: string;
  readonly info?: string;
  readonly valueClass?: string;
}

@Component({
  imports: [NgIcon],
  providers: [
    provideIcons({
      lucideArrowDownUp,
      lucideCalendarDays,
      lucideChartLine,
      lucideFlame,
      lucideHash,
      lucidePercent,
      lucideTarget,
      lucideTrendingDown,
    }),
  ],
  selector: 'app-quick-stats',
  templateUrl: './quick-stats.html',
})
export class QuickStats {
  readonly stats = input.required<readonly QuickStat[]>();
  readonly gridClass = input('grid gap-3 sm:grid-cols-2 lg:grid-cols-3');
}
