import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterOutlet } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowDownUp,
  lucideBookOpen,
  lucideChartLine,
  lucideLayoutDashboard,
  lucideMenu,
  lucideMoon,
  lucideNotebookPen,
  lucideSun,
  lucideTrendingDown,
  lucideTrendingUp,
  lucideWallet,
} from '@ng-icons/lucide';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { MenuModule } from 'primeng/menu';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ToolbarModule } from 'primeng/toolbar';
import type { MenuItem } from 'primeng/api';
import { ALL_PORTFOLIOS_ID } from './portfolios';
import { TradesStore } from './features/trades/trades-store';
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
    FormsModule,
    NgIcon,
    AvatarModule,
    ButtonModule,
    DrawerModule,
    MenuModule,
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
    { label: 'Settings', url: '/settings', icon: 'pi pi-cog' },
  ];

  protected readonly overviewMenu: MenuItem[] = [
    { label: 'Dashboard', icon: 'pi pi-th-large', routerLink: '/dashboard', command: () => this.closeSidebar() },
  ];

  protected readonly workspaceMenu: MenuItem[] = [
    { label: 'Trades', icon: 'pi pi-arrow-right-arrow-left', routerLink: '/trades', command: () => this.closeSidebar() },
    { label: 'Journal', icon: 'pi pi-book', routerLink: '/journal', command: () => this.closeSidebar() },
    { label: 'Analytics', icon: 'pi pi-chart-line', routerLink: '/analytics', command: () => this.closeSidebar() },
  ];

  protected readonly settingsMenu: MenuItem[] = [
    { label: 'Settings', icon: 'pi pi-cog', routerLink: '/settings', command: () => this.closeSidebar() },
  ];

  protected readonly portfolioOptions = computed(() => [
    { label: 'All portfolios', value: this.allId },
    ...this.store.portfolios().map((p) => ({ label: p.name, value: p.id })),
  ]);

  protected readonly netTotal = computed(() =>
    this.store.activeTrades().reduce((sum, trade) => sum + trade.net, 0),
  );

  protected readonly tradeCount = computed(() => this.store.activeTrades().length);

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
