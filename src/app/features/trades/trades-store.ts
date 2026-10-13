import { computed, effect, Injectable, signal } from '@angular/core';
import { Collection } from '@signaldb/core';
import angularReactivityAdapter from '@signaldb/angular';
import createLocalStorageAdapter from '@signaldb/localstorage';
import { deriveTrade, complianceOf, normalizeRuleChecks, normalizeTags } from './trade-math';
import { EMPTY_FILTER, applyGlobalFilter, isFilterActive } from './trades-filter';
import type { GlobalFilter } from './trades-filter';
import type { Trade, TradeInput } from './trade';

@Injectable({ providedIn: 'root' })
export class TradesStore {
  private readonly collection = new Collection<Trade, string>({
    reactivity: angularReactivityAdapter,
    persistence: createLocalStorageAdapter<Trade, string>(
      'openjournal-trades',
    ),
  });

  readonly trades = signal<readonly Trade[]>([]);

  readonly filter = signal<GlobalFilter>({ ...EMPTY_FILTER });

  readonly isFiltering = computed(() => isFilterActive(this.filter()));

  readonly filteredTrades = computed(() =>
    applyGlobalFilter(this.trades(), this.filter()),
  );

  readonly filteredByCloseDesc = computed(() =>
    [...this.filteredTrades()].sort(
      (a, b) => +new Date(b.closedAt) - +new Date(a.closedAt),
    ),
  );

  setFilter(patch: Partial<GlobalFilter>): void {
    this.filter.update((current) => ({ ...current, ...patch }));
  }

  resetFilter(): void {
    this.filter.set({ ...EMPTY_FILTER });
  }

  constructor() {
    effect((onCleanup) => {
      const cursor = this.collection.find();
      this.trades.set(
        cursor.fetch().map((t) => {
          // Frozen history wins: a stored Compliance value is never recomputed,
          // so later normalization changes cannot move old scores. Legacy
          // Trades without one derive it from their (possibly empty) snapshot.
          const rules = normalizeRuleChecks(t.rules);
          const compliance =
            typeof t.compliance === 'number' ? t.compliance : complianceOf(rules);
          return { ...t, rules, compliance, tags: normalizeTags(t.tags) };
        }),
      );
      onCleanup(() => cursor.cleanup());
    });
  }

  addTrade(input: TradeInput): Trade {
    const trade = deriveTrade(input, crypto.randomUUID());
    this.collection.insert(trade);
    this.trades.update((current) => [...current, trade]);
    return trade;
  }

  whenReady(): Promise<void> {
    return this.collection.isReady();
  }

  byCloseDesc(): Trade[] {
    return [...this.trades()].sort(
      (a, b) => +new Date(b.closedAt) - +new Date(a.closedAt),
    );
  }
}
