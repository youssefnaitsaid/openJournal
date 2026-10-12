import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { TradesStore } from '../trades/trades-store';
import { buildMonth, monthSummary } from './journal-calendar';
import { loadStartingBalance } from '../../settings';

@Component({
  imports: [DatePipe],
  selector: 'app-journal',
  styleUrl: './journal.css',
  templateUrl: './journal.html',
})
export class Journal {
  readonly store = inject(TradesStore);

  readonly startingBalance = signal(loadStartingBalance());

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
    buildMonth(this.store.trades(), this.cursor().year, this.cursor().month),
  );

  readonly summary = computed(() =>
    monthSummary(
      this.store.trades(),
      this.cursor().year,
      this.cursor().month,
      this.startingBalance(),
    ),
  );

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
      .trades()
      .filter((t) => t.closedAt.slice(0, 10) === day);
  });

  prev(): void {
    const { year, month } = this.cursor();
    this.cursor.set(
      month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 },
    );
  }

  next(): void {
    const { year, month } = this.cursor();
    this.cursor.set(
      month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 },
    );
  }

  goToCurrent(): void {
    const now = new Date();
    this.cursor.set({
      year: now.getUTCFullYear(),
      month: now.getUTCMonth(),
    });
  }
}
