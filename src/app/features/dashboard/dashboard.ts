import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideChartLine,
  lucideTrendingDown,
  lucideTrendingUp,
} from '@ng-icons/lucide';
import { TradesStore } from '../trades/trades-store';
import { computeMetrics } from './dashboard-metrics';
import type { BalancePoint } from './dashboard-metrics';
import { loadStartingBalance, saveStartingBalance } from '../../settings';
import { EmptyState } from '../../ui/empty-state';
import { QuickStats, type QuickStat } from '../../ui/quick-stats';

function toChartPoints(curve: readonly BalancePoint[]): string {
  if (curve.length === 0) return '';
  const values = curve.map((p) => p.balance);
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  return curve
    .map((p, i) => {
      const x = curve.length === 1 ? 50 : (i / (curve.length - 1)) * 100;
      const y = 36 - ((p.balance - min) / span) * 32;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

@Component({
  imports: [DatePipe, NgIcon, QuickStats, EmptyState],
  providers: [
    provideIcons({ lucideChartLine, lucideTrendingDown, lucideTrendingUp }),
  ],
  selector: 'app-dashboard',
  styleUrl: './dashboard.css',
  templateUrl: './dashboard.html',
})
export class Dashboard {
  readonly store = inject(TradesStore);
  private readonly router = inject(Router);

  readonly startingBalance = signal(loadStartingBalance());

  readonly metrics = computed(() =>
    computeMetrics(this.store.trades(), this.startingBalance()),
  );

  readonly profitFactorText = computed(() => {
    const pf = this.metrics().profitFactor;
    return Number.isFinite(pf) ? pf.toFixed(2) : '∞';
  });

  readonly chartPoints = computed(() =>
    toChartPoints(this.metrics().balanceCurve),
  );

  readonly isPositive = computed(() => this.metrics().netTotal >= 0);

  readonly quickStats = computed<readonly QuickStat[]>(() => {
    const m = this.metrics();
    return [
      {
        icon: 'lucidePercent',
        label: 'Trade win %',
        value: this.formatPercent(m.winRate),
      },
      { icon: 'lucideChartLine', label: 'Profit factor', value: this.profitFactorText() },
      {
        icon: 'lucideCalendarDays',
        label: 'Day win %',
        value: this.formatPercent(m.dayWinRate),
      },
      {
        icon: 'lucideArrowDownUp',
        label: 'Avg win / loss',
        value: `${m.avgWin} / ${m.avgLoss}`,
      },
      { icon: 'lucideHash', label: 'Total trades', value: `${m.totalTrades}` },
    ];
  });

  readonly formatPercent = (value: number): string => value.toFixed(2);

  onBalanceInput(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (Number.isFinite(value) && value >= 0) {
      this.startingBalance.set(value);
      saveStartingBalance(value);
    }
  }

  goToTrades(): void {
    void this.router.navigate(['/trades']);
  }
}
