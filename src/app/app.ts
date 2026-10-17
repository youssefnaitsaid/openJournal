import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
  lucideSettings,
  lucideSun,
  lucideTrendingDown,
  lucideTrendingUp,
  lucideWallet,
} from '@ng-icons/lucide';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ToolbarModule } from 'primeng/toolbar';
import { ALL_PORTFOLIOS_ID } from './portfolios';
import { TradesStore } from './features/trades/trades-store';
import { formatSignedDollars } from './features/dashboard/dashboard-metrics';
import { ThemeService } from './theme';

interface NavItem {
  readonly label: string;
  readonly url: string;
  readonly icon: string;
}

@Component({
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    FormsModule,
    NgIcon,
    AvatarModule,
    ButtonModule,
    DrawerModule,
    SelectModule,
    TagModule,
    ToolbarModule,
  ],
  providers: [
    provideIcons({
      lucideArrowDownUp,
      lucideBookOpen,
      lucideChartLine,
      lucideLayoutDashboard,
      lucideMenu,
      lucideMoon,
      lucideNotebookPen,
      lucideSettings,
      lucideSun,
      lucideTrendingDown,
      lucideTrendingUp,
      lucideWallet,
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

  protected readonly overviewItems: readonly NavItem[] = [
    { label: 'Dashboard', url: '/dashboard', icon: 'lucideLayoutDashboard' },
  ];

  protected readonly workspaceItems: readonly NavItem[] = [
    { label: 'Trades', url: '/trades', icon: 'lucideArrowDownUp' },
    { label: 'Journal', url: '/journal', icon: 'lucideBookOpen' },
    { label: 'Analytics', url: '/analytics', icon: 'lucideChartLine' },
  ];

  protected readonly settingsItems: readonly NavItem[] = [
    { label: 'Settings', url: '/settings', icon: 'lucideSettings' },
  ];

  protected readonly portfolioOptions = computed(() => [
    { label: 'All portfolios', value: this.allId },
    ...this.store.portfolios().map((p) => ({ label: p.name, value: p.id })),
  ]);

  protected readonly netTotal = computed(() =>
    this.store.activeTrades().reduce((sum, trade) => sum + trade.net, 0),
  );

  protected readonly tradeCount = computed(() => this.store.activeTrades().length);

  protected readonly formatSignedDollars = formatSignedDollars;

  protected onSelectActive(event: Event | { value: string }): void {
    const value =
      event instanceof Event
        ? (event.target as HTMLSelectElement | null)?.value
        : event.value;
    if (typeof value !== 'string') return;
    this.store.setActiveId(value);
  }

  protected toggleSidebar(): void {
    this.sidebarOpen.update((open) => !open);
  }

  protected closeSidebar(): void {
    this.sidebarOpen.set(false);
  }
}
