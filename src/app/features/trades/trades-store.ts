import { computed, effect, Injectable, signal } from '@angular/core';
import { Collection } from '@signaldb/core';
import angularReactivityAdapter from '@signaldb/angular';
import createLocalStorageAdapter from '@signaldb/localstorage';
import { deriveTrade, complianceOf, normalizeRuleChecks, normalizeTags } from './trade-math';
import { EMPTY_FILTER, applyGlobalFilter, isFilterActive } from './trades-filter';
import type { GlobalFilter } from './trades-filter';
import type { Trade, TradeInput } from './trade';
import {
  ALL_PORTFOLIOS_ID,
  DEFAULT_PORTFOLIO_ID,
  allStartingBalance,
  createPortfolio,
  deletePortfolio,
  loadActiveId,
  loadPortfolios,
  renamePortfolio,
  resolveActiveId,
  saveActiveId,
  savePortfolios,
  setStartingBalance,
} from '../../portfolios';
import type { Portfolio } from '../../portfolios';
import {
  UNSET_GUARDS,
  guardsFor,
  loadGuardMap,
  saveGuardMap,
  setGuardSettings,
} from '../../guards';
import type { GuardSettings } from '../../guards';

function normalizePortfolioId(value: unknown): string {
  return typeof value === 'string' && value.trim() !== '' ? value : DEFAULT_PORTFOLIO_ID;
}

@Injectable({ providedIn: 'root' })
export class TradesStore {
  private readonly collection = new Collection<Trade, string>({
    reactivity: angularReactivityAdapter,
    persistence: createLocalStorageAdapter<Trade, string>(
      'openjournal-trades',
    ),
  });

  readonly trades = signal<readonly Trade[]>([]);

  readonly portfolios = signal<readonly Portfolio[]>(loadPortfolios());

  readonly activeId = signal(
    resolveActiveId(loadActiveId(), loadPortfolios()),
  );

  readonly isAll = computed(() => this.activeId() === ALL_PORTFOLIOS_ID);

  readonly canLog = computed(() => !this.isAll());

  readonly activeTrades = computed(() => {
    const id = this.activeId();
    if (id === ALL_PORTFOLIOS_ID) return this.trades();
    return this.trades().filter((t) => t.portfolioId === id);
  });

  readonly activeBalance = computed(() => {
    const list = this.portfolios();
    const id = this.activeId();
    if (id === ALL_PORTFOLIOS_ID) return allStartingBalance(list);
    const found = list.find((p) => p.id === id);
    return found ? found.startingBalance : allStartingBalance(list);
  });

  readonly activeName = computed(() => {
    const id = this.activeId();
    if (id === ALL_PORTFOLIOS_ID) return 'All';
    return this.portfolios().find((p) => p.id === id)?.name ?? 'All';
  });

  readonly filter = signal<GlobalFilter>({ ...EMPTY_FILTER });

  readonly isFiltering = computed(() => isFilterActive(this.filter()));

  readonly guardMap = signal<Record<string, GuardSettings>>(loadGuardMap());

  readonly activeGuards = computed(() =>
    this.isAll() ? structuredClone(UNSET_GUARDS) : guardsFor(this.guardMap(), this.activeId()),
  );

  readonly filteredTrades = computed(() =>
    applyGlobalFilter(this.trades(), this.filter()),
  );

  readonly filteredByCloseDesc = computed(() =>
    [...this.filteredTrades()].sort(
      (a, b) => +new Date(b.closedAt) - +new Date(a.closedAt),
    ),
  );

  readonly activeFilteredTrades = computed(() =>
    applyGlobalFilter(this.activeTrades(), this.filter()),
  );

  readonly activeByCloseDesc = computed(() =>
    [...this.activeFilteredTrades()].sort(
      (a, b) => +new Date(b.closedAt) - +new Date(a.closedAt),
    ),
  );

  setFilter(patch: Partial<GlobalFilter>): void {
    this.filter.update((current) => ({ ...current, ...patch }));
  }

  resetFilter(): void {
    this.filter.set({ ...EMPTY_FILTER });
  }

  setActiveId(id: string): void {
    this.activeId.set(resolveActiveId(id, this.portfolios()));
    saveActiveId(this.activeId());
    this.resetFilter();
  }

  refreshPortfolios(): void {
    const list = loadPortfolios();
    this.portfolios.set(list);
    this.activeId.set(resolveActiveId(loadActiveId(), list));
    this.guardMap.set(loadGuardMap());
  }

  saveActiveGuards(settings: GuardSettings): void {
    if (this.isAll()) return;
    this.guardMap.set(setGuardSettings(this.guardMap(), this.activeId(), settings));
  }

  addPortfolio(name: string): string | null {
    const { list, error } = createPortfolio(this.portfolios(), name);
    if (error !== null) return error;
    savePortfolios(list);
    this.portfolios.set(list);
    return null;
  }

  renamePortfolio(id: string, name: string): string | null {
    const { list, error } = renamePortfolio(this.portfolios(), id, name);
    if (error !== null) return error;
    savePortfolios(list);
    this.portfolios.set(list);
    return null;
  }

  removePortfolio(id: string): string | null {
    const { list, error } = deletePortfolio(this.portfolios(), id);
    if (error !== null) return error;
    this.collection.removeMany({ portfolioId: id } as Partial<Trade>);
    const guards = { ...this.guardMap() };
    delete guards[id];
    saveGuardMap(guards);
    this.guardMap.set(guards);
    savePortfolios(list);
    this.portfolios.set(list);
    this.trades.update((current) => current.filter((t) => t.portfolioId !== id));
    if (this.activeId() === id) this.setActiveId(ALL_PORTFOLIOS_ID);
    return null;
  }

  setPortfolioBalance(id: string, value: number): void {
    const list = setStartingBalance(this.portfolios(), id, value);
    savePortfolios(list);
    this.portfolios.set(list);
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
          return {
            ...t,
            portfolioId: normalizePortfolioId(
              (t as Partial<Trade>).portfolioId,
            ),
            rules,
            compliance,
            tags: normalizeTags(t.tags),
          };
        }),
      );
      onCleanup(() => cursor.cleanup());
    });
  }

  removeTrade(id: string): void {
    this.collection.removeOne({ id } as Partial<Trade>);
    this.trades.update((current) => current.filter((t) => t.id !== id));
  }

  addTrade(input: TradeInput): Trade {
    const active = this.activeId();
    const trade = deriveTrade(
      {
        ...input,
        portfolioId:
          input.portfolioId ?? (active === ALL_PORTFOLIOS_ID ? DEFAULT_PORTFOLIO_ID : active),
      },
      crypto.randomUUID(),
    );
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
