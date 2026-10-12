import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { TradesStore } from '../trades/trades-store';
import { computeMetrics } from './dashboard-metrics';
import type { BalancePoint } from './dashboard-metrics';
import { loadStartingBalance, saveStartingBalance } from '../../settings';

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
  imports: [DatePipe],
  selector: 'app-dashboard',
  styleUrl: './dashboard.css',
  templateUrl: './dashboard.html',
})
export class Dashboard {
  readonly store = inject(TradesStore);

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

  readonly formatPercent = (value: number): string => value.toFixed(2);

  onBalanceInput(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (Number.isFinite(value) && value >= 0) {
      this.startingBalance.set(value);
      saveStartingBalance(value);
    }
  }
}
