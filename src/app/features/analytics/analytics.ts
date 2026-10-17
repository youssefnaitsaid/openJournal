import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

@Component({
  imports: [FormsModule, EmptyState, FilterBar, PageHero, CardModule, ChartModule, SelectModule, TableModule, TagModule],
  selector: 'app-analytics',
  styleUrl: './analytics.css',
  templateUrl: './analytics.html',
})
export class Analytics {
  readonly store = inject(TradesStore);
  private readonly router = inject(Router);

  // Honest states: an empty Portfolio shows ONE onboarding card (no band,
  // no filter bar, no sections); a filter that cuts every Trade shows
  // filtered-empty per surface instead — never "No Trades yet" over data.
  readonly hasPortfolioTrades = computed(
    () => this.store.activeTrades().length > 0,
  );

  readonly filteredEmpty = computed(
    () =>
      this.hasPortfolioTrades() &&
      this.store.activeFilteredTrades().length === 0,
  );

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

  readonly complianceRows = computed(() => {
    const compliance = this.compliance();
    return [
      {
        bucket: '100% followed',
        bucketTrades: compliance.full.trades,
        bucketNet: compliance.full.netTotal,
        bucketWinRate: compliance.full.winRate,
      },
      {
        bucket: 'Partial (<100%)',
        bucketTrades: compliance.partial.trades,
        bucketNet: compliance.partial.netTotal,
        bucketWinRate: compliance.partial.winRate,
      },
    ];
  });

  // Chart-only presentation selection: the ten rows with the largest |Net|,
  // descending (alphabetical tiebreak). The table below always keeps every
  // row; computeBreakdowns' derivation and default order are untouched.
  readonly breakdownChart = computed(() => {
    const rows = [...this.breakdowns()]
      .sort(
        (a, b) =>
          Math.abs(b.netTotal) - Math.abs(a.netTotal) ||
          a.value.localeCompare(b.value),
      )
      .slice(0, 10);
    return {
      labels: rows.map((r) => r.value),
      datasets: [
        {
          label: 'Net P&L',
          data: rows.map((r) => r.netTotal),
        },
      ],
    };
  });

  readonly chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
  };

  // Compact R-metrics band in the Breakdown section header — the tile strip
  // is gone; same metrics, same formatters, label:value definition-list style.
  readonly kpiBand = computed(() => {
    const m = this.metrics();
    return [
      { label: 'R-Expectancy (avg R)', value: this.formatR(m.rExpectancy) },
      { label: 'Median R', value: this.formatR(m.medianR) },
      { label: 'R sum', value: this.formatR(m.rSum) },
      { label: 'Risked Amount', value: this.formatSignedDollars(m.riskedTotal) },
      { label: 'Net P&L', value: this.formatSignedDollars(m.netTotal) },
      { label: 'Risked coverage', value: `${m.riskedCount} of ${m.totalTrades}` },
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

  goToTrades(): void {
    void this.router.navigate(['/trades']);
  }
}
