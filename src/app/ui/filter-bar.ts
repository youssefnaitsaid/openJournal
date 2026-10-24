import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronDown, lucideChevronUp, lucideRotateCcw } from '@ng-icons/lucide';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { FloatLabelModule } from 'primeng/floatlabel';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { SETUPS, GRADES } from '../features/trades/trade';
import type { Grade, Side } from '../features/trades/trade';
import { countActiveFilterAxes } from '../features/trades/trades-filter';
import type { GlobalFilter, OutcomeFilter } from '../features/trades/trades-filter';
import { TradesStore } from '../features/trades/trades-store';
import {
  tagOptionsWithTrades,
  taxonomyOptions,
  taxonomyVersion,
} from '../features/journal/taxonomy';

// FloatLabel treats an empty-string value as "no value": the label stays inside
// the field and paints over the displayed option. The "All" option therefore
// carries a real value and is mapped back to the empty filter (no constraint)
// on write, the same idiom the Outcome axis already used.
const ALL = 'All';

@Component({
  imports: [FormsModule, NgIcon, ButtonModule, DatePickerModule, InputTextModule, SelectModule, TagModule, ToggleButtonModule, FloatLabelModule],
  providers: [provideIcons({ lucideChevronDown, lucideChevronUp, lucideRotateCcw })],
  selector: 'app-filter-bar',
  templateUrl: './filter-bar.html',
})
export class FilterBar {
  readonly store = inject(TradesStore);

  // Below 1440px the controls fold behind a flat "Filters (n)" disclosure; at
  // 1440px and wider the same controls sit on one line. The state lives here
  // (not in the store) because it is presentation only.
  readonly expanded = signal(false);

  readonly activeAxisCount = computed(() =>
    countActiveFilterAxes(this.store.filter()),
  );

  readonly disclosureLabel = computed(() => {
    const count = this.activeAxisCount();
    return count === 0 ? 'Filters' : `Filters (${count})`;
  });

  readonly setupOptions = computed(() => {
    taxonomyVersion();
    return taxonomyOptions('setup', SETUPS);
  });

  readonly tagOptions = computed(() =>
    tagOptionsWithTrades(this.store.trades()),
  );

  readonly setupSelectOptions = computed((): { label: string; value: string }[] => [
    { label: 'All', value: ALL },
    ...this.setupOptions().map((s) => ({ label: s, value: s })),
  ]);

  readonly sideSelectOptions = computed((): { label: string; value: Side | typeof ALL }[] => [
    { label: 'All', value: ALL },
    { label: 'Long', value: 'Long' },
    { label: 'Short', value: 'Short' },
  ]);

  readonly tagSelectOptions = computed((): { label: string; value: string }[] => [
    { label: 'All', value: ALL },
    ...this.tagOptions().map((t) => ({ label: t, value: t })),
  ]);

  readonly outcomeSelectOptions: { label: string; value: OutcomeFilter }[] = [
    { label: 'All', value: 'All' },
    { label: 'Win', value: 'Win' },
    { label: 'Loss', value: 'Loss' },
    { label: 'Breakeven', value: 'Breakeven' },
  ];

  readonly gradeSelectOptions: { label: string; value: Grade | typeof ALL }[] = [
    { label: 'All', value: ALL },
    ...GRADES.map((grade) => ({ label: grade, value: grade as Grade })),
  ];

  readonly dateFromValue = computed(() => {
    const raw = this.store.filter().dateFrom;
    return raw === '' ? null : new Date(`${raw}T00:00:00.000Z`);
  });

  readonly dateToValue = computed(() => {
    const raw = this.store.filter().dateTo;
    return raw === '' ? null : new Date(`${raw}T00:00:00.000Z`);
  });

  // A select needs a non-empty value for FloatLabel to lift its label out of
  // the field, so these read the "All" sentinel while the filter stays empty.
  readonly setupValue = computed(() => this.store.filter().setup || ALL);
  readonly sideValue = computed((): Side | typeof ALL => this.store.filter().side || ALL);
  readonly tagValue = computed(() => this.store.filter().tag || ALL);
  readonly gradeValue = computed((): Grade | typeof ALL => this.store.filter().grade || ALL);

  onTextChange(field: 'dateFrom' | 'dateTo' | 'asset', event: Event): void {
    const el = event.target as HTMLInputElement | null;
    if (el) this.store.setFilter({ [field]: el.value } as Partial<GlobalFilter>);
  }

  onSetupChange(event: Event | { value: string }): void {
    const value =
      event instanceof Event
        ? (event.target as HTMLSelectElement | null)?.value ?? ''
        : event.value;
    this.store.setFilter({ setup: value === ALL ? '' : value });
  }

  onSideChange(event: Event | { value: Side | '' | typeof ALL }): void {
    const value =
      event instanceof Event
        ? ((event.target as HTMLSelectElement | null)?.value as Side | '' | typeof ALL)
        : event.value;
    if (value !== undefined) this.store.setFilter({ side: value === ALL ? '' : value });
  }

  onTagChange(event: Event | { value: string }): void {
    const value =
      event instanceof Event
        ? (event.target as HTMLSelectElement | null)?.value ?? ''
        : event.value;
    this.store.setFilter({ tag: value === ALL ? '' : value });
  }

  onOutcomeChange(event: Event | { value: OutcomeFilter }): void {
    const value =
      event instanceof Event
        ? ((event.target as HTMLSelectElement | null)?.value as OutcomeFilter)
        : event.value;
    if (value !== undefined) this.store.setFilter({ outcome: value });
  }

  onGradeChange(event: Event | { value: Grade | '' | typeof ALL }): void {
    const value =
      event instanceof Event
        ? ((event.target as HTMLSelectElement | null)?.value as Grade | '' | typeof ALL)
        : event.value;
    if (value !== undefined) this.store.setFilter({ grade: value === ALL ? '' : value });
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

  toggleExpanded(): void {
    this.expanded.update((open) => !open);
  }
}
