import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideListFilter, lucideRotateCcw } from '@ng-icons/lucide';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { SETUPS, GRADES } from '../features/trades/trade';
import type { Grade, Side } from '../features/trades/trade';
import type { GlobalFilter, OutcomeFilter } from '../features/trades/trades-filter';
import { TradesStore } from '../features/trades/trades-store';
import {
  tagOptionsWithTrades,
  taxonomyOptions,
  taxonomyVersion,
} from '../features/journal/taxonomy';

@Component({
  imports: [FormsModule, NgIcon, ButtonModule, CardModule, DatePickerModule, InputTextModule, SelectModule, TagModule, ToggleButtonModule],
  providers: [provideIcons({ lucideListFilter, lucideRotateCcw })],
  selector: 'app-filter-bar',
  templateUrl: './filter-bar.html',
})
export class FilterBar {
  readonly store = inject(TradesStore);

  readonly setupOptions = computed(() => {
    taxonomyVersion();
    return taxonomyOptions('setup', SETUPS);
  });

  readonly tagOptions = computed(() =>
    tagOptionsWithTrades(this.store.trades()),
  );

  readonly setupSelectOptions = computed(() => [
    { label: 'All', value: '' },
    ...this.setupOptions().map((s) => ({ label: s, value: s })),
  ]);

  readonly sideSelectOptions = computed(() => [
    { label: 'All', value: '' },
    { label: 'Long', value: 'Long' },
    { label: 'Short', value: 'Short' },
  ]);

  readonly tagSelectOptions = computed(() => [
    { label: 'All', value: '' },
    ...this.tagOptions().map((t) => ({ label: t, value: t })),
  ]);

  readonly outcomeSelectOptions = [
    { label: 'All', value: 'All' },
    { label: 'Win', value: 'Win' },
    { label: 'Loss', value: 'Loss' },
    { label: 'Breakeven', value: 'Breakeven' },
  ];

  readonly gradeSelectOptions: { label: string; value: '' | Grade }[] = [
    { label: 'All', value: '' },
    ...GRADES.map((grade) => ({ label: grade, value: grade as '' | Grade })),
  ];

  readonly dateFromValue = computed(() => {
    const raw = this.store.filter().dateFrom;
    return raw === '' ? null : new Date(`${raw}T00:00:00.000Z`);
  });

  readonly dateToValue = computed(() => {
    const raw = this.store.filter().dateTo;
    return raw === '' ? null : new Date(`${raw}T00:00:00.000Z`);
  });

  readonly countText = computed(() => {
    const total = this.store.trades().length;
    const shown = this.store.filteredTrades().length;
    return `${shown} of ${total}`;
  });

  onTextChange(field: 'dateFrom' | 'dateTo' | 'asset', event: Event): void {
    const el = event.target as HTMLInputElement | null;
    if (el) this.store.setFilter({ [field]: el.value } as Partial<GlobalFilter>);
  }

  onSetupChange(event: Event | { value: string }): void {
    const value =
      event instanceof Event
        ? (event.target as HTMLSelectElement | null)?.value ?? ''
        : event.value;
    this.store.setFilter({ setup: value });
  }

  onSideChange(event: Event | { value: '' | Side }): void {
    const value =
      event instanceof Event
        ? ((event.target as HTMLSelectElement | null)?.value as '' | Side)
        : event.value;
    if (value !== undefined) this.store.setFilter({ side: value });
  }

  onTagChange(event: Event | { value: string }): void {
    const value =
      event instanceof Event
        ? (event.target as HTMLSelectElement | null)?.value ?? ''
        : event.value;
    this.store.setFilter({ tag: value });
  }

  onOutcomeChange(event: Event | { value: OutcomeFilter }): void {
    const value =
      event instanceof Event
        ? ((event.target as HTMLSelectElement | null)?.value as OutcomeFilter)
        : event.value;
    if (value !== undefined) this.store.setFilter({ outcome: value });
  }

  onGradeChange(event: Event | { value: '' | Grade }): void {
    const value =
      event instanceof Event
        ? ((event.target as HTMLSelectElement | null)?.value as '' | Grade)
        : event.value;
    if (value !== undefined) this.store.setFilter({ grade: value });
  }

  get needsReviewModel(): boolean {
    return this.store.filter().needsReview;
  }

  set needsReviewModel(value: boolean) {
    this.store.setFilter({ needsReview: value === true });
  }

  onDateChange(field: 'dateFrom' | 'dateTo', value: Date | null): void {
    if (value === null) {
      this.store.setFilter({ [field]: '' } as Partial<GlobalFilter>);
      return;
    }
    this.store.setFilter({
      [field]: value.toISOString().slice(0, 10),
    } as Partial<GlobalFilter>);
  }

  reset(): void {
    this.store.resetFilter();
  }
}
