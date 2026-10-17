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
  lucidePencil,
  lucidePlus,
  lucideSun,
  lucideTrash2,
  lucideTrendingDown,
  lucideTrendingUp,
  lucideWallet,
  lucideX,
} from '@ng-icons/lucide';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { DrawerModule } from 'primeng/drawer';
import { InputTextModule } from 'primeng/inputtext';
import { MenuModule } from 'primeng/menu';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
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
    ConfirmDialogModule,
    DialogModule,
    DrawerModule,
    InputTextModule,
    MenuModule,
    SelectModule,
    TagModule,
    ToastModule,
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
      lucidePencil,
      lucidePlus,
      lucideSun,
      lucideTrash2,
      lucideTrendingDown,
      lucideTrendingUp,
      lucideWallet,
      lucideX,
    }),
    ConfirmationService,
    MessageService,
  ],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly store = inject(TradesStore);
  protected readonly theme = inject(ThemeService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly toast = inject(MessageService);

  protected readonly allId = ALL_PORTFOLIOS_ID;

  protected readonly sidebarOpen = signal(false);
  protected readonly portfolioDialog = signal(false);

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

  protected readonly overviewMenu: MenuItem[] = [
    { label: 'Dashboard', icon: 'pi pi-th-large', routerLink: '/dashboard', command: () => this.closeSidebar() },
  ];

  protected readonly workspaceMenu: MenuItem[] = [
    { label: 'Trades', icon: 'pi pi-arrow-right-arrow-left', routerLink: '/trades', command: () => this.closeSidebar() },
    { label: 'Journal', icon: 'pi pi-book', routerLink: '/journal', command: () => this.closeSidebar() },
    { label: 'Analytics', icon: 'pi pi-chart-line', routerLink: '/analytics', command: () => this.closeSidebar() },
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
      this.toast.add({ severity: 'success', summary: 'Portfolio created', detail: created?.name ?? '' });
    }
  }

  protected onRenameValue(event: Event): void {
    this.renameValue.set((event.target as HTMLInputElement).value);
  }

  protected renameActive(): void {
    if (this.store.isAll()) return;
    const error = this.store.renamePortfolio(this.store.activeId(), this.renameValue());
    this.renameError.set(error);
    if (error === null) {
      this.renameValue.set('');
      this.portfolioDialog.set(false);
      this.toast.add({ severity: 'success', summary: 'Portfolio renamed' });
    }
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
    if (error === null) this.toast.add({ severity: 'info', summary: 'Portfolio deleted' });
  }

  protected requestDelete(event: Event): void {
    if (this.store.isAll()) return;
    this.confirmation.confirm({
      target: event.target ?? undefined,
      message: `Delete "${this.store.activeName()}" plus its Trades?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Keep',
      accept: () => {
        this.confirmingDelete.set(true);
        this.deleteActive();
      },
    });
  }

  protected toggleSidebar(): void {
    this.sidebarOpen.update((open) => !open);
  }

  protected closeSidebar(): void {
    this.sidebarOpen.set(false);
  }
}
