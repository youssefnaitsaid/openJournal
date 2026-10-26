import { Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideFlame, lucideWallet, lucideZap } from '@ng-icons/lucide';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TradesStore } from '../trades/trades-store';
import { ThemeService } from '../../theme';
import {
  computeKpiBand,
  computeMetrics,
  formatGuardStatus,
  formatPercent,
  formatProfitFactor,
  formatSignedDollars,
} from './dashboard-metrics';
import type { KpiLine } from './dashboard-metrics';
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

interface KpiGroupView {
  readonly title: string;
  readonly icon: string;
  readonly lines: KpiLine[];
}

@Component({
  imports: [DatePipe, NgIcon, RouterLink, ButtonModule, CardModule, ChartModule, TableModule, TagModule, PageHero, EmptyState],
  providers: [provideIcons({ lucideFlame, lucideWallet, lucideZap })],
  selector: 'app-dashboard',
  styleUrl: './dashboard.css',
  templateUrl: './dashboard.html',
})
export class Dashboard {
  readonly store = inject(TradesStore);
  private readonly router = inject(Router);
  readonly theme = inject(ThemeService);

  readonly startingBalance = computed(() => this.store.activeBalance());

  // Chart colors are canvas paints, not CSS: they read the live NoirSlate
  // preset variables and re-evaluate with the theme toggle so the curve
  // stays legible in both schemes (DESIGN.md: preset-level color only).
  private chartToken(name: string, fallback: string): string {
    if (typeof document === 'undefined') return fallback;
    this.theme.isDark();
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
  }

  // Axis labels read as "Oct 24", not the raw ISO day; the table and tooltip
  // keep the full close stamp.
  private shortDay(iso: string): string {
    const date = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  }

  private chartFill(stroke: string): string {
    // 8% alpha wash under the curve — enough to anchor the line, light
    // enough not to gray out the chart field; hex-only guard keeps jsdom
    // defaults safe.
    const m = /^#([0-9a-f])([0-9a-f])([0-9a-f])([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(stroke);
    if (!m) return 'rgba(113, 113, 122, 0.08)';
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(stroke.slice(i, i + 2), 16));
    return `rgba(${r}, ${g}, ${b}, 0.08)`;
  }

  readonly chartData = computed(() => {
    const curve = this.metrics().balanceCurve;
    const stroke = this.chartToken('--p-primary-color', '#71717a');
    return {
      labels: curve.map((p) => this.shortDay(p.closedAt)),
      datasets: [
        {
          label: 'Balance',
          data: curve.map((p) => p.balance),
          fill: true,
          tension: 0.35,
          borderColor: stroke,
          backgroundColor: this.chartFill(stroke),
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 3,
        },
      ],
    };
  });

  readonly chartOptions = computed(() => {
    // Canvas does not inherit the preset's muted text token; read it (and the
    // content border) so axis labels and the grid clear AA in both schemes.
    const tick = this.chartToken('--p-text-muted-color', '#64748b');
    const grid = this.chartToken('--p-content-border-color', '#e2e8f0');
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: { maxTicksLimit: 6, color: tick },
          grid: { display: false },
        },
        y: {
          ticks: { maxTicksLimit: 5, color: tick },
          grid: { color: grid },
          border: { display: false },
        },
      },
    };
  });

  readonly metrics = computed(() =>
    computeMetrics(this.store.activeTrades(), this.startingBalance()),
  );

  readonly kpiBand = computed(() =>
    computeKpiBand(this.metrics(), this.startingBalance()),
  );

  // One band card, three rule-separated groups; computeKpiBand orders the
  // nine lines contiguously by group so no label is repeated in the view.
  readonly kpiGroups = computed<readonly KpiGroupView[]>(() => {
    const band = this.kpiBand();
    return [
      { title: 'Edge', icon: 'lucideZap', lines: band.slice(0, 3) },
      { title: 'Consistency', icon: 'lucideFlame', lines: band.slice(3, 6) },
      { title: 'Account', icon: 'lucideWallet', lines: band.slice(6, 9) },
    ];
  });

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
