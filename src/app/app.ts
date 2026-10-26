import { Component, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
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

interface NavGroup {
  readonly label: string;
  readonly items: readonly NavItem[];
}

@Component({
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    NgTemplateOutlet,
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
    }),
  ],
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {
  protected readonly store = inject(TradesStore);
  protected readonly theme = inject(ThemeService);

  protected readonly allId = ALL_PORTFOLIOS_ID;

  protected readonly sidebarOpen = signal(false);

  // One source for both the desktop rail and the mobile drawer, so the two
  // navigations can never drift in order or content.
  protected readonly navGroups: readonly NavGroup[] = [
    {
      label: 'Overview',
      items: [
        { label: 'Dashboard', url: '/dashboard', icon: 'lucideLayoutDashboard' },
      ],
    },
    {
      label: 'Workspace',
      items: [
        { label: 'Trades', url: '/trades', icon: 'lucideArrowDownUp' },
        { label: 'Journal', url: '/journal', icon: 'lucideBookOpen' },
        { label: 'Analytics', url: '/analytics', icon: 'lucideChartLine' },
      ],
    },
    {
      label: 'Configuration',
      items: [
        { label: 'Settings', url: '/settings', icon: 'lucideSettings' },
      ],
    },
  ];

  protected readonly portfolioOptions = computed(() => [
    { label: 'All portfolios', value: this.allId },
    ...this.store.portfolios().map((p) => ({ label: p.name, value: p.id })),
  ]);

  protected readonly netTotal = computed(() =>
    this.store.activeTrades().reduce((sum, trade) => sum + trade.net, 0),
  );

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
