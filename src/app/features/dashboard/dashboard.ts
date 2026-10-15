import { Component, computed, effect, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideChartLine,
  lucideShield,
  lucideTrendingDown,
  lucideTrendingUp,
} from '@ng-icons/lucide';
import { TradesStore } from '../trades/trades-store';
import { computeMetrics } from './dashboard-metrics';
import type { BalancePoint } from './dashboard-metrics';
import { computeRMetrics } from '../analytics/analytics-metrics';
import {
  GUARD_LABELS,
  evaluateGuards,
  hasAnyGuard,
  toGuardFormInput,
  validateGuardInput,
  weekKeyOfDay,
} from '../../guards';
import type { GuardFormInput } from '../../guards';
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
    provideIcons({ lucideChartLine, lucideShield, lucideTrendingDown, lucideTrendingUp }),
  ],
  selector: 'app-dashboard',
  styleUrl: './dashboard.css',
  templateUrl: './dashboard.html',
})
export class Dashboard {
  readonly store = inject(TradesStore);
  private readonly router = inject(Router);

  readonly startingBalance = computed(() => this.store.activeBalance());

  readonly guards = computed(() => this.store.activeGuards());
  readonly guardInputs = signal<GuardFormInput>(
    toGuardFormInput(this.store.activeGuards()),
  );
  readonly guardErrors = signal<readonly string[]>([]);

  constructor() {
    effect(() => {
      this.guardInputs.set(toGuardFormInput(this.guards()));
      this.guardErrors.set([]);
    });
  }

  readonly weekGuardBreaches = computed(() => {
    const guards = this.guards();
    if (!hasAnyGuard(guards)) return [];
    const today = new Date().toISOString().slice(0, 10);
    const week = weekKeyOfDay(today);
    return evaluateGuards(this.store.activeTrades(), guards).weeks.get(week)?.breached ?? [];
  });

  readonly weekStatusText = computed(() => {
    if (this.store.isAll())
      return 'All portfolios: Guards are set per Portfolio — select one to manage them';
    if (!hasAnyGuard(this.guards())) return 'No Guards set';
    const breached = this.weekGuardBreaches();
    if (breached.length === 0) return 'This week: inside all Guards';
    return `This week breached: ${breached.map((breach) => GUARD_LABELS[breach]).join(', ')}`;
  });

  onGuardField(field: keyof GuardFormInput, event: Event): void {
    const next = {
      ...this.guardInputs(),
      [field]: (event.target as HTMLInputElement).value,
    };
    this.guardInputs.set(next);
    const { settings, errors } = validateGuardInput(next);
    this.guardErrors.set(errors);
    if (errors.length === 0) {
      this.store.saveActiveGuards(settings);
    }
  }

  readonly metrics = computed(() =>
    computeMetrics(this.store.activeTrades(), this.startingBalance()),
  );

  readonly profitFactorText = computed(() => {
    const pf = this.metrics().profitFactor;
    return Number.isFinite(pf) ? pf.toFixed(2) : '∞';
  });

  readonly chartPoints = computed(() =>
    toChartPoints(this.metrics().balanceCurve),
  );

  readonly isPositive = computed(() => this.metrics().netTotal >= 0);

  readonly filteredStrip = computed(() => {
    const filtered = this.store.activeFilteredTrades();
    const metrics = computeMetrics(filtered, this.startingBalance());
    const risk = computeRMetrics(filtered);
    return {
      shown: filtered.length,
      total: this.store.activeTrades().length,
      netTotal: metrics.netTotal,
      winRate: metrics.winRate,
      avgR: risk.rExpectancy,
    };
  });

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
      {
        icon: 'lucideTrendingDown',
        label: 'Max drawdown',
        value: `$${m.maxDrawdown} · ${this.formatPercent(m.maxDrawdownPct)}%`,
        valueClass: m.maxDrawdown > 0 ? 'text-destructive' : 'text-foreground',
      },
      {
        icon: 'lucideFlame',
        label: 'Streaks',
        value: `W${m.currentWinStreak} · L${m.currentLossStreak} / Best W${m.longestWinStreak} · L${m.longestLossStreak}`,
      },
      {
        icon: 'lucideTarget',
        label: 'Expectancy / Trade',
        value: this.formatSignedDollars(m.expectancy),
        valueClass:
          m.expectancy > 0
            ? 'text-success'
            : m.expectancy < 0
              ? 'text-destructive'
              : 'text-foreground',
      },
    ];
  });

  readonly formatPercent = (value: number): string => value.toFixed(2);

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

  onBalanceInput(event: Event): void {
    if (this.store.isAll()) return;
    const value = Number((event.target as HTMLInputElement).value);
    if (Number.isFinite(value) && value >= 0) {
      this.store.setPortfolioBalance(this.store.activeId(), value);
    }
  }

  goToTrades(): void {
    void this.router.navigate(['/trades']);
  }
}
