import { Component, computed, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideTarget } from '@ng-icons/lucide';
import { TradesStore } from '../trades/trades-store';
import { computeRMetrics } from './analytics-metrics';
import { EmptyState } from '../../ui/empty-state';
import { PageHero } from '../../ui/page-hero';
import { QuickStats, type QuickStat } from '../../ui/quick-stats';

@Component({
  imports: [NgIcon, EmptyState, PageHero, QuickStats],
  providers: [provideIcons({ lucideTarget })],
  selector: 'app-analytics',
  styleUrl: './analytics.css',
  templateUrl: './analytics.html',
})
export class Analytics {
  readonly store = inject(TradesStore);

  readonly metrics = computed(() => computeRMetrics(this.store.trades()));

  readonly quickStats = computed<readonly QuickStat[]>(() => {
    const m = this.metrics();
    return [
      {
        icon: 'lucideTarget',
        label: 'R-Expectancy (avg R)',
        value: this.formatR(m.rExpectancy),
        valueClass: this.rClass(m.rExpectancy),
      },
      {
        icon: 'lucideChartLine',
        label: 'Median R',
        value: this.formatR(m.medianR),
        valueClass: this.rClass(m.medianR),
      },
      {
        icon: 'lucideHash',
        label: 'R sum',
        value: this.formatR(m.rSum),
        valueClass: this.rClass(m.rSum),
      },
      {
        icon: 'lucideFlame',
        label: 'Total risked',
        value: this.formatSignedDollars(m.riskedTotal),
      },
      {
        icon: 'lucideArrowDownUp',
        label: 'Total net',
        value: this.formatSignedDollars(m.netTotal),
        valueClass:
          m.netTotal > 0
            ? 'text-success'
            : m.netTotal < 0
              ? 'text-destructive'
              : 'text-foreground',
      },
      {
        icon: 'lucidePercent',
        label: 'Risked coverage',
        value: `${m.riskedCount} of ${m.totalTrades}`,
      },
    ];
  });

  readonly formatR = (value: number): string => {
    const abs = Math.abs(value).toFixed(2);
    if (value > 0) return `+${abs}R`;
    if (value < 0) return `-${abs}R`;
    return `0.00R`;
  };

  readonly formatSignedDollars = (value: number): string => {
    const abs = Math.abs(value).toFixed(2);
    if (value > 0) return `+$${abs}`;
    if (value < 0) return `-$${abs}`;
    return `$0.00`;
  };

  private readonly rClass = (value: number): string =>
    value > 0 ? 'text-success' : value < 0 ? 'text-destructive' : 'text-foreground';
}
