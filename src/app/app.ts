import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowDownUp,
  lucideBookOpen,
  lucideChartLine,
  lucideLayoutDashboard,
  lucideMenu,
  lucideMoon,
  lucideNotebookPen,
  lucidePencil,
  lucidePlus,
  lucideSun,
  lucideTrash2,
  lucideTrendingDown,
  lucideTrendingUp,
  lucideWallet,
  lucideX,
} from '@ng-icons/lucide';
import { ALL_PORTFOLIOS_ID } from './portfolios';
import { TradesStore } from './features/trades/trades-store';
import { ThemeService } from './theme';

interface NavItem {
  readonly label: string;
  readonly url: string;
  readonly icon: string;
}

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgIcon],
  providers: [
    provideIcons({
      lucideArrowDownUp,
      lucideBookOpen,
      lucideChartLine,
      lucideLayoutDashboard,
      lucideMenu,
      lucideMoon,
      lucideNotebookPen,
      lucidePencil,
      lucidePlus,
      lucideSun,
      lucideTrash2,
      lucideTrendingDown,
      lucideTrendingUp,
      lucideWallet,
      lucideX,
    }),
  ],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly store = inject(TradesStore);
  protected readonly theme = inject(ThemeService);

  protected readonly allId = ALL_PORTFOLIOS_ID;

  protected readonly sidebarOpen = signal(false);

  protected readonly newPortfolioName = signal('');
  protected readonly portfolioError = signal<string | null>(null);
  protected readonly renameValue = signal('');
  protected readonly renameError = signal<string | null>(null);
  protected readonly confirmingDelete = signal(false);

  protected readonly overviewItems: readonly NavItem[] = [
    { label: 'Dashboard', url: '/dashboard', icon: 'lucideLayoutDashboard' },
  ];

  protected readonly workspaceItems: readonly NavItem[] = [
    { label: 'Trades', url: '/trades', icon: 'lucideArrowDownUp' },
    { label: 'Journal', url: '/journal', icon: 'lucideBookOpen' },
    { label: 'Analytics', url: '/analytics', icon: 'lucideChartLine' },
  ];

  protected readonly netTotal = computed(() =>
    this.store.activeTrades().reduce((sum, trade) => sum + trade.net, 0),
  );

  protected readonly tradeCount = computed(() => this.store.activeTrades().length);

  protected onSelectActive(event: Event): void {
    const el = event.target as HTMLSelectElement | null;
    if (el === null) return;
    this.store.setActiveId(el.value);
    this.confirmingDelete.set(false);
    this.portfolioError.set(null);
    this.renameError.set(null);
    this.renameValue.set('');
  }

  protected onNewName(event: Event): void {
    this.newPortfolioName.set((event.target as HTMLInputElement).value);
  }

  protected createPortfolio(): void {
    const error = this.store.addPortfolio(this.newPortfolioName());
    this.portfolioError.set(error);
    if (error === null) {
      const created = this.store.portfolios()[this.store.portfolios().length - 1];
      if (created !== undefined) this.store.setActiveId(created.id);
      this.newPortfolioName.set('');
    }
  }

  protected onRenameValue(event: Event): void {
    this.renameValue.set((event.target as HTMLInputElement).value);
  }

  protected renameActive(): void {
    if (this.store.isAll()) return;
    const error = this.store.renamePortfolio(this.store.activeId(), this.renameValue());
    this.renameError.set(error);
    if (error === null) this.renameValue.set('');
  }

  protected deleteActive(): void {
    if (this.store.isAll()) return;
    if (!this.confirmingDelete()) {
      this.confirmingDelete.set(true);
      return;
    }
    const error = this.store.removePortfolio(this.store.activeId());
    this.portfolioError.set(error);
    this.confirmingDelete.set(false);
  }

  protected toggleSidebar(): void {
    this.sidebarOpen.update((open) => !open);
  }

  protected closeSidebar(): void {
    this.sidebarOpen.set(false);
  }
}
