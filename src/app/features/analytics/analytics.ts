import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TradesStore } from '../trades/trades-store';
import {
  computeBreakdowns,
  computeComplianceCorrelation,
  computeRMetrics,
  computeTimePatterns,
  type BreakdownDimension,
  type TimeDimension,
} from './analytics-metrics';
import { EmptyState } from '../../ui/empty-state';
import { FilterBar } from '../../ui/filter-bar';
import { PageHero } from '../../ui/page-hero';
import { QuickStats, type QuickStat } from '../../ui/quick-stats';
import { CardModule } from 'primeng/card';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';

@Component({
  imports: [FormsModule, EmptyState, FilterBar, PageHero, QuickStats, CardModule, SelectModule, TableModule],
  selector: 'app-analytics',
  styleUrl: './analytics.css',
  templateUrl: './analytics.html',
})
export class Analytics {
  readonly store = inject(TradesStore);

  readonly metrics = computed(() =>
    computeRMetrics(this.store.activeFilteredTrades()),
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
    computeBreakdowns(this.store.activeFilteredTrades(), this.dimension()),
  );

  readonly timeDimension = signal<TimeDimension>('weekday');

  readonly timeDimensions: readonly { readonly value: TimeDimension; readonly label: string }[] =
    [
      { value: 'weekday', label: 'Weekday' },
      { value: 'hour', label: 'Hour' },
      { value: 'hold', label: 'Hold Duration' },
    ];

  readonly timeDimensionLabel = computed(
    () => this.timeDimensions.find((d) => d.value === this.timeDimension())?.label ?? 'Weekday',
  );

  readonly timePatterns = computed(() =>
    computeTimePatterns(this.store.activeFilteredTrades(), this.timeDimension()),
  );

  readonly compliance = computed(() =>
    computeComplianceCorrelation(this.store.activeFilteredTrades()),
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

  readonly formatCompliance = (value: number | null): string =>
    value === null ? '—' : `${value.toFixed(2)}%`;

  private readonly rClass = (value: number): string =>
    value > 0 ? 'text-success' : value < 0 ? 'text-destructive' : 'text-foreground';
}
