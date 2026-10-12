import { effect, Injectable, signal } from '@angular/core';
import { Collection } from '@signaldb/core';
import angularReactivityAdapter from '@signaldb/angular';
import createLocalStorageAdapter from '@signaldb/localstorage';
import { deriveTrade } from './trade-math';
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

  constructor() {
    effect((onCleanup) => {
      const cursor = this.collection.find();
      this.trades.set(cursor.fetch());
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
