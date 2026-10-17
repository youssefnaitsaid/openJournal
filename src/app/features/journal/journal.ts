import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideChevronDown,
  lucideChevronLeft,
  lucideChevronRight,
  lucideClipboardCheck,
  lucideClipboardCopy,
  lucideShieldAlert,
  lucideShieldCheck,
} from '@ng-icons/lucide';
import { TradesStore } from '../trades/trades-store';
import { buildMonth, monthSummary } from './journal-calendar';
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

@Component({
  imports: [DatePipe, NgIcon, EmptyState, PageHero, CardModule, MessageModule, ButtonModule, TagModule, TableModule],
  providers: [
    provideIcons({
      lucideChevronDown,
      lucideChevronLeft,
      lucideChevronRight,
      lucideClipboardCheck,
      lucideClipboardCopy,
      lucideShieldAlert,
      lucideShieldCheck,
    }),
  ],
  selector: 'app-journal',
  styleUrl: './journal.css',
  templateUrl: './journal.html',
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
    const day = this.selectedDay();
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

  readonly selectedDay = signal<string | null>(
    this.today.toISOString().slice(0, 10),
  );

  readonly dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  readonly weeks = computed(() =>
    buildMonth(this.store.activeTrades(), this.cursor().year, this.cursor().month),
  );

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
    const day = this.selectedDay();
    if (day === null) return [];
    return this.store
      .activeTrades()
      .filter((t) => t.closedAt.slice(0, 10) === day);
  });

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
