import { Component, computed, inject, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideTarget } from '@ng-icons/lucide';
import { TradesStore } from '../trades/trades-store';
import {
  computeBreakdowns,
  computeRMetrics,
  type BreakdownDimension,
} from './analytics-metrics';
import { EmptyState } from '../../ui/empty-state';
import { FilterBar } from '../../ui/filter-bar';
import { PageHero } from '../../ui/page-hero';
import { QuickStats, type QuickStat } from '../../ui/quick-stats';

@Component({
  imports: [NgIcon, EmptyState, FilterBar, PageHero, QuickStats],
  providers: [provideIcons({ lucideTarget })],
  selector: 'app-analytics',
  styleUrl: './analytics.css',
  templateUrl: './analytics.html',
})
export class Analytics {
  readonly store = inject(TradesStore);

  readonly metrics = computed(() =>
    computeRMetrics(this.store.filteredTrades()),
  );

  readonly dimension = signal<BreakdownDimension>('setup');

  readonly dimensions: readonly { readonly value: BreakdownDimension; readonly label: string }[] =
    [
      { value: 'setup', label: 'Setup' },
      { value: 'asset', label: 'Asset' },
      { value: 'market', label: 'Market' },
      { value: 'side', label: 'Side' },
      { value: 'emotionBefore', label: 'Emotion-before' },
      { value: 'emotionAfter', label: 'Emotion-after' },
      { value: 'mistake', label: 'Mistake' },
      { value: 'grade', label: 'Grade' },
      { value: 'tag', label: 'Tag' },
    ];

  readonly dimensionLabel = computed(
    () => this.dimensions.find((d) => d.value === this.dimension())?.label ?? 'Setup',
  );

  readonly breakdowns = computed(() =>
    computeBreakdowns(this.store.filteredTrades(), this.dimension()),
  );

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

  readonly formatPercent = (value: number): string => `${value.toFixed(2)}%`;

  onDimensionChange(event: Event): void {
    const el = event.target as HTMLSelectElement | null;
    if (el) this.dimension.set(el.value as BreakdownDimension);
  }

  private readonly rClass = (value: number): string =>
    value > 0 ? 'text-success' : value < 0 ? 'text-destructive' : 'text-foreground';
}
