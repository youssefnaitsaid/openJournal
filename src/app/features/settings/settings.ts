import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucidePencil,
  lucidePlus,
  lucideSlidersHorizontal,
  lucideTrash2,
  lucideX,
} from '@ng-icons/lucide';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import {
  GUARD_LABELS,
  evaluateGuards,
  hasAnyGuard,
  toGuardFormInput,
  validateGuardInput,
  weekKeyOfDay,
} from '../../guards';
import type { GuardFormInput } from '../../guards';
import { allStartingBalance } from '../../portfolios';
import { EMOTIONS, MISTAKES, SETUPS } from '../trades/trade';
import {
  addTaxonomyValue,
  getPlaybook,
  playbookOptions,
  setPlaybookArchived,
  setPlaybookRules,
  taxonomyOptions,
  taxonomyVersion,
} from '../journal/taxonomy';
import type { TaxonomyKind } from '../journal/taxonomy';
import { TradesStore } from '../trades/trades-store';
import { PageHero } from '../../ui/page-hero';
import { formatDollars } from '../dashboard/dashboard-metrics';

@Component({
  imports: [
    FormsModule,
    NgIcon,
    ButtonModule,
    CardModule,
    ConfirmDialogModule,
    DatePickerModule,
    InputNumberModule,
    InputTextModule,
    MessageModule,
    ToastModule,
    PageHero,
  ],
  providers: [
    provideIcons({
      lucidePencil,
      lucidePlus,
      lucideSlidersHorizontal,
      lucideTrash2,
      lucideX,
    }),
    ConfirmationService,
    MessageService,
  ],
  selector: 'app-settings',
  styleUrl: './settings.css',
  templateUrl: './settings.html',
})
export class Settings {
  readonly store = inject(TradesStore);
  private readonly confirmation = inject(ConfirmationService);
  private readonly toast = inject(MessageService);

  readonly portfolios = computed(() => this.store.portfolios());

  protected readonly newPortfolioName = signal('');
  protected readonly portfolioError = signal<string | null>(null);
  protected readonly renamingId = signal<string | null>(null);
  protected readonly renameValue = signal('');
  protected readonly renameError = signal<string | null>(null);

  // Starting balance lives once per Portfolio in the Portfolios card; the All
  // anchor is the read-only sum shown beside them.
  readonly allAnchorBalance = computed(() =>
    allStartingBalance(this.portfolios()),
  );
  readonly formatDollars = formatDollars;

  // Guards edit the active Portfolio's daily and weekly brakes.
  readonly guards = computed(() => this.store.activeGuards());
  readonly guardInputs = signal<GuardFormInput>(
    toGuardFormInput(this.store.activeGuards()),
  );
  readonly guardErrors = signal<readonly string[]>([]);

  constructor() {
    effect(() => {
      this.guardInputs.set(toGuardFormInput(this.guards()));
      this.guardErrors.set([]);
    });
  }

  readonly weekGuardBreaches = computed(() => {
    const guards = this.guards();
    if (!hasAnyGuard(guards)) return [];
    const today = new Date().toISOString().slice(0, 10);
    const week = weekKeyOfDay(today);
    return (
      evaluateGuards(this.store.activeTrades(), guards).weeks.get(week)?.breached ??
      []
    );
  });

  readonly weekStatusText = computed(() => {
    if (this.store.isAll()) return '';
    if (!hasAnyGuard(this.guards())) return 'No Guards set';
    const breached = this.weekGuardBreaches();
    if (breached.length === 0) return 'This week: inside all Guards';
    return `This week breached: ${breached
      .map((breach) => GUARD_LABELS[breach])
      .join(', ')}`;
  });

  onGuardField(field: keyof GuardFormInput, event: Event): void {
    const next = {
      ...this.guardInputs(),
      [field]: (event.target as HTMLInputElement).value,
    };
    this.guardInputs.set(next);
    const { settings, errors } = validateGuardInput(next);
    this.guardErrors.set(errors);
    if (errors.length === 0) {
      this.store.saveActiveGuards(settings);
    }
  }

  onGuardNumber(field: keyof GuardFormInput, value: number | null): void {
    this.onGuardField(field, {
      target: { value: value === null ? '' : String(value) },
    } as unknown as Event);
  }

  onGuardStopTime(date: Date | null): void {
    const text =
      date === null
        ? ''
        : `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    this.onGuardField('stopTime', {
      target: { value: text },
    } as unknown as Event);
  }

  readonly guardStopTimeValue = computed(() => {
    const raw = this.guardInputs().stopTime;
    if (raw === '') return null;
    const [h, m] = raw.split(':').map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    const d = new Date();
    d.setHours(h ?? 0, m ?? 0, 0, 0);
    return d;
  });

  readonly toNumberOrNull = (value: string): number | null =>
    value === '' ? null : Number(value);

  // Vocabulary: the taxonomy editors relocated out of Trades.
  readonly setupVocabulary = computed(() => {
    taxonomyVersion();
    return taxonomyOptions('setup', SETUPS);
  });
  readonly emotionVocabulary = computed(() => {
    taxonomyVersion();
    return taxonomyOptions('emotion', EMOTIONS);
  });
  readonly mistakeVocabulary = computed(() => {
    taxonomyVersion();
    return taxonomyOptions('mistake', MISTAKES);
  });
  readonly tagVocabulary = computed(() => {
    taxonomyVersion();
    return taxonomyOptions('tag', []);
  });

  addVocabulary(kind: TaxonomyKind, rawValue: string): void {
    if (kind === 'tag') {
      for (const part of rawValue.split(',')) {
        const trimmed = part.trim();
        if (trimmed !== '') addTaxonomyValue('tag', trimmed);
      }
      return;
    }
    addTaxonomyValue(kind, rawValue);
  }

  // Playbooks: Rule lists + archived state per Setup, relocated out of Trades.
  readonly playbooks = computed(() => {
    taxonomyVersion();
    return playbookOptions(SETUPS);
  });
  readonly activePlaybooks = computed(() =>
    this.playbooks().filter((p) => !p.archived),
  );
  readonly archivedPlaybooks = computed(() =>
    this.playbooks().filter((p) => p.archived),
  );

  addPlaybookRule(name: string, value: string): void {
    const trimmed = value.trim();
    if (trimmed === '') return;
    const previous = getPlaybook(name);
    setPlaybookRules(name, [...previous.rules, trimmed]);
  }

  removePlaybookRule(name: string, index: number): void {
    const previous = getPlaybook(name);
    setPlaybookRules(
      name,
      previous.rules.filter((_, i) => i !== index),
    );
  }

  archivePlaybook(name: string): void {
    setPlaybookArchived(name, true);
  }

  unarchivePlaybook(name: string): void {
    setPlaybookArchived(name, false);
  }

  public onNewPortfolioName(value: string): void {
    this.newPortfolioName.set(value);
  }

  public createPortfolio(): void {
    const error = this.store.addPortfolio(this.newPortfolioName());
    this.portfolioError.set(error);
    if (error === null) {
      const list = this.store.portfolios();
      this.newPortfolioName.set('');
      this.toast.add({
        severity: 'success',
        summary: 'Portfolio created',
        detail: list[list.length - 1]?.name ?? '',
      });
    }
  }

  public startRename(id: string): void {
    const portfolio = this.portfolios().find((p) => p.id === id);
    this.renamingId.set(id);
    this.renameValue.set(portfolio?.name ?? '');
    this.renameError.set(null);
  }

  protected cancelRename(): void {
    this.renamingId.set(null);
    this.renameValue.set('');
    this.renameError.set(null);
  }

  public onRenameValue(value: string): void {
    this.renameValue.set(value);
  }

  public commitRename(): void {
    const id = this.renamingId();
    if (id === null) return;
    const error = this.store.renamePortfolio(id, this.renameValue());
    this.renameError.set(error);
    if (error === null) this.cancelRename();
  }

  public onPortfolioBalance(id: string, value: number | null): void {
    if (value === null) return;
    this.store.setPortfolioBalance(id, value);
  }

  public requestDelete(id: string): void {
    const name = this.portfolios().find((p) => p.id === id)?.name ?? '';
    this.confirmation.confirm({
      target: undefined,
      message: `Delete "${name}" plus its Trades?`,
      acceptLabel: 'Delete',
      rejectLabel: 'Keep',
      accept: () => this.deletePortfolio(id),
    });
  }

  private deletePortfolio(id: string): void {
    const error = this.store.removePortfolio(id);
    this.portfolioError.set(error);
    if (error === null) {
      this.toast.add({ severity: 'info', summary: 'Portfolio deleted' });
    }
  }
}
