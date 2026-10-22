import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCalendarDays,
  lucideChevronDown,
  lucideChevronLeft,
  lucideChevronRight,
  lucideClipboardCheck,
  lucideClipboardCopy,
  lucideShieldAlert,
} from '@ng-icons/lucide';
import { TradesStore } from '../trades/trades-store';
import { buildMonth, monthSummary } from './journal-calendar';
import type { DayCell } from './journal-calendar';
import {
  formatDollars,
  formatSignedDollars,
} from '../dashboard/dashboard-metrics';
import {
  GUARD_LABELS,
  evaluateGuards,
  hasAnyGuard,
  weekKeyOfDay,
} from '../../guards';
import type { GuardBreach } from '../../guards';
import {
  computeMonthReportCard,
  formatMonthReportCard,
} from './journal-report-card';
import { EmptyState } from '../../ui/empty-state';
import { PageHero } from '../../ui/page-hero';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';

// Calendar chips are the narrowest money surface in the app, so they trade
// cents for fit; the day table, summary, and aria labels keep exact values.
const dayWholeDollars = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
});
const dayThousands = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
});

@Component({
  imports: [DatePipe, NgIcon, EmptyState, PageHero, CardModule, MessageModule, ButtonModule, TagModule, TableModule],
  providers: [
    provideIcons({
      lucideCalendarDays,
      lucideChevronDown,
      lucideChevronLeft,
      lucideChevronRight,
      lucideClipboardCheck,
      lucideClipboardCopy,
      lucideShieldAlert,
    }),
  ],
  selector: 'app-journal',
  templateUrl: './journal.html',
  styleUrl: './journal.css',
})
export class Journal {
  readonly store = inject(TradesStore);
  private readonly router = inject(Router);

  readonly startingBalance = computed(() => this.store.activeBalance());

  readonly guards = computed(() => this.store.activeGuards());

  readonly hasGuards = computed(() => hasAnyGuard(this.guards()));

  readonly guardEvaluation = computed(() =>
    evaluateGuards(this.store.activeTrades(), this.guards()),
  );

  readonly dayBreaches = (date: string): readonly GuardBreach[] =>
    this.guardEvaluation().days.get(date)?.breached ?? [];

  readonly selectedDayBreaches = computed((): readonly GuardBreach[] => {
    const day = this.activeDay();
    if (day === null) return [];
    const evaluation = this.guardEvaluation();
    return [
      ...(evaluation.days.get(day)?.breached ?? []),
      ...(evaluation.weeks.get(weekKeyOfDay(day))?.breached ?? []),
    ];
  });

  readonly selectedBreachLabels = computed(() =>
    this.selectedDayBreaches().map((breach) => GUARD_LABELS[breach]),
  );

  private readonly today = new Date();

  readonly cursor = signal({
    year: this.today.getUTCFullYear(),
    month: this.today.getUTCMonth(),
  });

  readonly selectedDay = signal<string | null>(null);

  readonly dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  readonly weeks = computed(() =>
    buildMonth(this.store.activeTrades(), this.cursor().year, this.cursor().month),
  );

  private readonly monthPrefix = computed(() => {
    const { year, month } = this.cursor();
    return `${year}-${String(month + 1).padStart(2, '0')}`;
  });

  // A month opens on its latest close day, so the page lands on evidence
  // instead of an empty today. An explicit selection inside the shown month
  // always wins; navigating away falls back to the new month's latest close.
  readonly activeDay = computed<string | null>(() => {
    const selected = this.selectedDay();
    if (selected !== null && selected.startsWith(this.monthPrefix())) {
      return selected;
    }
    let latest: string | null = null;
    for (const week of this.weeks()) {
      for (const cell of week) {
        if (
          cell !== null &&
          cell.trades.length > 0 &&
          (latest === null || cell.date > latest)
        ) {
          latest = cell.date;
        }
      }
    }
    return latest;
  });

  readonly dayLabel = (date: string): string =>
    new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    });

  readonly activeDayLabel = computed(() => {
    const day = this.activeDay();
    return day === null ? '' : this.dayLabel(day);
  });

  readonly dayAriaLabel = (cell: DayCell): string => {
    const date = this.dayLabel(cell.date);
    if (cell.trades.length === 0) return date;
    const breach =
      this.hasGuards() && this.dayBreaches(cell.date).length > 0
        ? ', Guard breached'
        : '';
    return `${date}, ${formatSignedDollars(cell.dayNet)}${breach}`;
  };

  readonly dayNetSeverity = (
    value: number,
  ): 'success' | 'danger' | 'secondary' =>
    value > 0 ? 'success' : value < 0 ? 'danger' : 'secondary';

  // Calendar cells stay narrow: whole-dollar days drop the cents, four-figure
  // days round to the dollar, and five-figure days compact to thousands so a
  // tag never outgrows its cell. A flat day reads as a bare 0, matching the
  // neutral tag; exact cents stay in the day table, summary, and aria labels.
  readonly dayNetText = (value: number): string => {
    if (value === 0) return '0';
    const sign = value > 0 ? '+' : '-';
    const abs = Math.abs(value);
    const rounded = Math.round(abs);
    if (rounded >= 10_000) {
      return `${sign}$${dayThousands.format(abs / 1000)}K`;
    }
    if (rounded >= 1_000) {
      return `${sign}$${dayWholeDollars.format(rounded)}`;
    }
    const formatted = formatSignedDollars(value);
    return formatted.endsWith('.00') ? formatted.slice(0, -3) : formatted;
  };

  readonly summary = computed(() =>
    monthSummary(
      this.store.activeTrades(),
      this.cursor().year,
      this.cursor().month,
      this.startingBalance(),
    ),
  );

  readonly reportCard = computed(() =>
    computeMonthReportCard(
      this.store.activeTrades(),
      this.cursor().year,
      this.cursor().month,
    ),
  );

  // A month without closes goes quiet: the summary and report card are
  // suppressed, not zero-filled. Month navigation keeps working either way.
  readonly monthHasCloses = computed(() => this.reportCard().totalTrades > 0);

  readonly reportMarkdown = computed(() =>
    formatMonthReportCard(this.reportCard()),
  );

  readonly copied = signal(false);

  // Row-expansion state for the selected day's table. Owned here (not via
  // pRowToggler) because the zoneless harness never sees PrimeNG's in-place
  // mutation of expandedRowKeys: a signal write re-binds the input and renders.
  readonly expandedDayRows = signal<Record<string, boolean>>({});

  toggleDayRow(id: string): void {
    this.expandedDayRows.update((keys) => {
      const next = { ...keys };
      if (next[id]) {
        delete next[id];
      } else {
        next[id] = true;
      }
      return next;
    });
  }

  readonly monthLabel = computed(() =>
    new Date(Date.UTC(this.cursor().year, this.cursor().month, 1)).toLocaleString(
      'en-US',
      { month: 'long', year: 'numeric', timeZone: 'UTC' },
    ),
  );

  readonly selectedTrades = computed(() => {
    const day = this.activeDay();
    if (day === null) return [];
    return this.store
      .activeTrades()
      .filter((t) => t.closedAt.slice(0, 10) === day);
  });

  readonly activeDayNet = computed(() =>
    this.selectedTrades().reduce((sum, trade) => sum + trade.net, 0),
  );

  prev(): void {
    const { year, month } = this.cursor();
    this.copied.set(false);
    this.cursor.set(
      month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 },
    );
  }

  next(): void {
    const { year, month } = this.cursor();
    this.copied.set(false);
    this.cursor.set(
      month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 },
    );
  }

  goToCurrent(): void {
    const now = new Date();
    this.copied.set(false);
    this.cursor.set({
      year: now.getUTCFullYear(),
      month: now.getUTCMonth(),
    });
  }

  goToTrades(): void {
    void this.router.navigate(['/trades']);
  }

  copyReport(): void {
    const text = this.reportMarkdown();
    const done = () => this.copied.set(true);
    const clipboard = (
      navigator as Navigator & {
        clipboard?: { writeText: (text: string) => Promise<void> };
      }
    ).clipboard;
    if (clipboard) {
      void clipboard.writeText(text).then(done, () => undefined);
    } else {
      done();
    }
  }

  readonly formatPercent = (value: number): string => value.toFixed(2);

  readonly profitFactorText = (value: number): string =>
    Number.isFinite(value) ? value.toFixed(2) : '∞';

  // Currency presentation delegates to the shared grouped formatters so a
  // five-figure month reads as $17,175.00 here exactly as it does on the
  // dashboard and in the shell chip; the derivations are untouched.
  readonly signedDollars = formatSignedDollars;
  readonly formatSignedDollars = formatSignedDollars;
  readonly formatDollars = formatDollars;

  readonly setupText = (entry: { value: string; netTotal: number } | null): string =>
    entry === null ? '—' : `${entry.value} (${this.signedDollars(entry.netTotal)})`;

  readonly mistakeText = (
    entry: { value: string; trades: number } | null,
  ): string => (entry === null ? '—' : `${entry.value} ×${entry.trades}`);

  readonly complianceText = (): string => {
    const card = this.reportCard();
    const fraction = `(${card.scored}/${card.totalTrades} scored)`;
    return card.avgCompliance === null
      ? `— ${fraction}`
      : `${card.avgCompliance.toFixed(2)}% ${fraction}`;
  };
}
