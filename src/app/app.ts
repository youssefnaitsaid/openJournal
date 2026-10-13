import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowDownUp,
  lucideBookOpen,
  lucideLayoutDashboard,
  lucideMenu,
  lucideMoon,
  lucideNotebookPen,
  lucideSun,
  lucideTrendingDown,
  lucideTrendingUp,
  lucideX,
} from '@ng-icons/lucide';
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
      lucideLayoutDashboard,
      lucideMenu,
      lucideMoon,
      lucideNotebookPen,
      lucideSun,
      lucideTrendingDown,
      lucideTrendingUp,
      lucideX,
    }),
  ],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  private readonly store = inject(TradesStore);
  protected readonly theme = inject(ThemeService);

  protected readonly sidebarOpen = signal(false);

  protected readonly overviewItems: readonly NavItem[] = [
    { label: 'Dashboard', url: '/dashboard', icon: 'lucideLayoutDashboard' },
  ];

  protected readonly workspaceItems: readonly NavItem[] = [
    { label: 'Trades', url: '/trades', icon: 'lucideArrowDownUp' },
    { label: 'Journal', url: '/journal', icon: 'lucideBookOpen' },
  ];

  protected readonly netTotal = computed(() =>
    this.store.trades().reduce((sum, trade) => sum + trade.net, 0),
  );

  protected readonly tradeCount = computed(() => this.store.trades().length);

  protected toggleSidebar(): void {
    this.sidebarOpen.update((open) => !open);
  }

  protected closeSidebar(): void {
    this.sidebarOpen.set(false);
  }
}
