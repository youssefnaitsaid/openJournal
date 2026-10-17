import { Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TradesStore } from '../trades/trades-store';
import {
  computeKpiBand,
  computeMetrics,
  formatGuardStatus,
  formatPercent,
  formatProfitFactor,
  formatSignedDollars,
} from './dashboard-metrics';
import { computeRMetrics } from '../analytics/analytics-metrics';
import {
  GUARD_LABELS,
  evaluateDayGuards,
  evaluateWeekGuards,
  hasAnyGuard,
  weekKeyOfDay,
} from '../../guards';
import { EmptyState } from '../../ui/empty-state';
import { PageHero } from '../../ui/page-hero';

interface GuardStatusView {
  readonly show: boolean;
  readonly text: string;
}

@Component({
  imports: [DatePipe, RouterLink, ButtonModule, CardModule, ChartModule, TableModule, TagModule, PageHero, EmptyState],
  selector: 'app-dashboard',
  styleUrl: './dashboard.css',
  templateUrl: './dashboard.html',
})
export class Dashboard {
  readonly store = inject(TradesStore);
  private readonly router = inject(Router);

  readonly startingBalance = computed(() => this.store.activeBalance());

  readonly chartData = computed(() => {
    const curve = this.metrics().balanceCurve;
    return {
      labels: curve.map((p) => p.closedAt.slice(0, 10)),
      datasets: [
        {
          label: 'Balance',
          data: curve.map((p) => p.balance),
          fill: true,
          tension: 0.35,
        },
      ],
    };
  });

  readonly chartOptions = computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { maxTicksLimit: 6 } },
      y: { ticks: { maxTicksLimit: 5 } },
    },
  }));

  readonly metrics = computed(() =>
    computeMetrics(this.store.activeTrades(), this.startingBalance()),
  );

  readonly kpiBand = computed(() =>
    computeKpiBand(this.metrics(), this.startingBalance()),
  );

  readonly isPositive = computed(() => this.metrics().netTotal >= 0);

  // Empty Portfolio → onboarding branch: hero + one honest card, and the
  // KPI band / balance chart / recent table are suppressed (not zero-filled).
  readonly hasTrades = computed(() => this.store.activeTrades().length > 0);

  // Read-only status: shown only while a specific Portfolio has a Guard set.
  // Under the All aggregate there is no editable Guard SET, so no status line
  // renders (ticket #35: appears ONLY when Guards are configured; All is
  // read-only). Editing lives in Settings; this line never renders an input.
  readonly guardStatus = computed<GuardStatusView>(() => {
    if (this.store.isAll()) {
      return { show: false, text: '' };
    }
    const guards = this.store.activeGuards();
    if (!hasAnyGuard(guards)) {
      return { show: false, text: '' };
    }
    const today = new Date().toISOString().slice(0, 10);
    const week = weekKeyOfDay(today);
    const active = this.store.activeTrades();
    const todayTrades = active.filter((t) => t.closedAt.slice(0, 10) === today);
    const weekTrades = active.filter(
      (t) => weekKeyOfDay(t.closedAt.slice(0, 10)) === week,
    );
    const dayNet = todayTrades.reduce((sum, t) => sum + t.net, 0);
    const weekNet = weekTrades.reduce((sum, t) => sum + t.net, 0);
    const breaches = [
      ...evaluateDayGuards(todayTrades, guards).breached,
      ...evaluateWeekGuards(weekTrades, guards).breached,
    ].map((breach) => GUARD_LABELS[breach]);
    return {
      show: true,
      text: formatGuardStatus({
        dailyLoss: { spent: Math.max(0, -dayNet), limit: guards.daily.maxLoss },
        dailyTrades: {
          count: todayTrades.length,
          limit: guards.daily.maxTrades,
        },
        dailyStop: guards.daily.stopTime,
        weeklyLoss: { spent: Math.max(0, -weekNet), limit: guards.weekly.maxLoss },
        weeklyTrades: {
          count: weekTrades.length,
          limit: guards.weekly.maxTrades,
        },
        breaches,
      }),
    };
  });

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

  readonly formatPercent = formatPercent;
  readonly formatSignedDollars = formatSignedDollars;
  readonly formatProfitFactor = formatProfitFactor;

  readonly formatR = (value: number): string => {
    const abs = Math.abs(value).toFixed(2);
    if (value > 0) return `+${abs}R`;
    if (value < 0) return `-${abs}R`;
    return `0.00R`;
  };

  goToTrades(): void {
    void this.router.navigate(['/trades']);
  }
}
