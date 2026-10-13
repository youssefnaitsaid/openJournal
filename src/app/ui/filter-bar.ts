import { Component, computed, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideListFilter, lucideRotateCcw } from '@ng-icons/lucide';
import { SETUPS } from '../features/trades/trade';
import type { Side } from '../features/trades/trade';
import type { GlobalFilter, OutcomeFilter } from '../features/trades/trades-filter';
import { TradesStore } from '../features/trades/trades-store';
import {
  tagOptionsWithTrades,
  taxonomyOptions,
  taxonomyVersion,
} from '../features/journal/taxonomy';

@Component({
  imports: [NgIcon],
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

  readonly countText = computed(() => {
    const total = this.store.trades().length;
    const shown = this.store.filteredTrades().length;
    return `${shown} of ${total}`;
  });

  onTextChange(field: 'dateFrom' | 'dateTo' | 'asset', event: Event): void {
    const el = event.target as HTMLInputElement | null;
    if (el) this.store.setFilter({ [field]: el.value } as Partial<GlobalFilter>);
  }

  onSetupChange(event: Event): void {
    const el = event.target as HTMLSelectElement | null;
    if (el) this.store.setFilter({ setup: el.value });
  }

  onSideChange(event: Event): void {
    const el = event.target as HTMLSelectElement | null;
    if (el) this.store.setFilter({ side: el.value as '' | Side });
  }

  onTagChange(event: Event): void {
    const el = event.target as HTMLSelectElement | null;
    if (el) this.store.setFilter({ tag: el.value });
  }

  onOutcomeChange(event: Event): void {
    const el = event.target as HTMLSelectElement | null;
    if (el) this.store.setFilter({ outcome: el.value as OutcomeFilter });
  }

  reset(): void {
    this.store.resetFilter();
  }
}
