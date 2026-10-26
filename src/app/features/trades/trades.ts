import { Component, computed, DestroyRef, effect, ElementRef, inject, signal, viewChild } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowDownUp,
  lucideChevronDown,
  lucideChevronRight,
  lucideChevronUp,
  lucideDownload,
} from '@ng-icons/lucide';
import { MessageService } from 'primeng/api';
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { GUARD_LABELS, evaluateGuards } from '../../guards';
import type { GuardBreach } from '../../guards';
import { EmptyState } from '../../ui/empty-state';
import { FilterBar } from '../../ui/filter-bar';
import { PageHero } from '../../ui/page-hero';
import {
  EMOTIONS,
  GRADES,
  MARKETS,
  MARKET_MULTIPLIERS,
  MISTAKES,
  SETUPS,
} from './trade';
import type {
  Emotion,
  Grade,
  Market,
  Mistake,
  RuleCheck,
  Setup,
  Side,
  Trade,
  TradeInput,
} from './trade';
import { isValidChartUrl, normalizeTags } from './trade-math';
import { formatSignedDollars } from '../dashboard/dashboard-metrics';
import { TradesStore } from './trades-store';
import {
  activeSetupOptions,
  addTaxonomyValue,
  getPlaybook,
  tagOptionsWithTrades,
  taxonomyOptions,
  taxonomyVersion,
} from '../journal/taxonomy';

function chartUrlValidator(
  control: AbstractControl<string | null>,
): ValidationErrors | null {
  return isValidChartUrl(control.value ?? '') ? null : { chartUrl: true };
}

// 0 is the form default and would derive a Net of -Fees, so a price must be
// a real positive print (facts: no zero-price round-trips).
function positivePriceValidator(
  control: AbstractControl<number | null>,
): ValidationErrors | null {
  const value = control.value;
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? null
    : { positivePrice: true };
}

type TradeFormDraft = ReturnType<Trades['form']['getRawValue']>;

@Component({
  imports: [ReactiveFormsModule, FormsModule, DatePipe, RouterLink, NgIcon, TableModule, ButtonModule, FloatLabelModule, InputTextModule, InputNumberModule, CheckboxModule, MessageModule, SelectModule, CardModule, TagModule, TextareaModule, ToastModule, EmptyState, FilterBar, PageHero],
  providers: [
    provideIcons({
      lucideArrowDownUp,
      lucideChevronDown,
      lucideChevronRight,
      lucideChevronUp,
      lucideDownload,
    }),
    MessageService,
  ],
  selector: 'app-trades',
  styleUrl: './trades.css',
  templateUrl: './trades.html',
})
export class Trades {
  readonly store = inject(TradesStore);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly toast = inject(MessageService);

  // The log form is hidden behind the hero button until deliberately revealed
  // (the dominant task - scan/sort/filter history - owns the viewport).
  readonly logFormOpen = signal(false);
  // Below lg the optional tail (Stop, Take, Risked Amount, Chart, Notes, Tags)
  // is disclosed in place; from lg up the region is always visible.
  readonly moreDetailsOpen = signal(false);
  readonly submitAttempted = signal(false);
  // Undo keeps the exact Trade and draft from the last save; the action removes
  // by id and restores the capture so a typo can be fixed in place.
  private readonly lastSaved = signal<{
    trade: Trade;
    draft: TradeFormDraft;
    checks: RuleCheck[];
    checklistTouched: boolean;
  } | null>(null);
  private readonly assetInput = viewChild<ElementRef<HTMLInputElement>>('assetInput');
  // The history table renders only once there are rows; a viewChild keeps the
  // Export action in the filter row above that branch instead of inside it.
  private readonly tradesTable = viewChild<Table>('dt');

  openLogForm(): void {
    this.logFormOpen.set(true);
    // Render the revealed form, then focus its first field for quick capture.
    this.cdr.detectChanges();
    this.assetInput()?.nativeElement.focus();
  }

  closeLogForm(): void {
    this.logFormOpen.set(false);
    this.moreDetailsOpen.set(false);
    this.submitAttempted.set(false);
  }

  toggleMoreDetails(): void {
    this.moreDetailsOpen.update((open) => !open);
  }

  toggleLogForm(): void {
    if (this.logFormOpen()) {
      this.closeLogForm();
    } else {
      this.openLogForm();
    }
  }

  resetFilters(): void {
    this.store.resetFilter();
  }

  undoLastSave(): void {
    const saved = this.lastSaved();
    if (!saved) return;
    // A scope switch changes where a re-log would file; dismiss instead of
    // restoring a draft into a different Portfolio.
    if (this.store.activeId() !== saved.trade.portfolioId) {
      this.dismissUndo();
      return;
    }
    this.store.removeTrade(saved.trade.id);
    this.dismissUndo();
    this.form.setValue(saved.draft);
    // setValue re-triggers the setup subscription, which clears the checklist.
    this.checks.set(saved.checks.map((check) => ({ ...check })));
    this.checklistTouched.set(saved.checklistTouched);
    this.submitAttempted.set(false);
    this.openLogForm();
  }

  private dismissUndo(): void {
    this.lastSaved.set(null);
    this.toast.clear();
  }

  // Logging is locked only under the All aggregate, so the picker lists the
  // concrete Portfolios a Trade can file into (facts: All stays read-only).
  readonly portfolioOptions = computed(() =>
    this.store.portfolios().map((portfolio) => ({
      label: portfolio.name,
      value: portfolio.id,
    })),
  );

  switchPortfolio(event: { value: string }): void {
    if (event?.value) this.store.setActiveId(event.value);
  }

  exportCsv(): void {
    this.tradesTable()?.exportCSV();
  }

  // Honest history count for the hero: "n of m" while filtering (filtered vs
  // active-Portfolio total), otherwise the plain total.
  readonly historyTotal = computed(() => this.store.activeTrades().length);

  readonly markets: readonly Market[] = MARKETS;

  readonly gradeOptions: { label: string; value: Grade }[] = GRADES.map(
    (grade) => ({ label: grade, value: grade }),
  );

  readonly sides: readonly Side[] = ['Long', 'Short'];

  readonly guards = computed(() => this.store.activeGuards());

  readonly todayGuardBreaches = computed((): readonly GuardBreach[] => {
    const today = new Date().toISOString().slice(0, 10);
    return evaluateGuards(this.store.activeTrades(), this.guards()).days.get(today)?.breached ?? [];
  });

  readonly todayGuardLabels = computed(() =>
    this.todayGuardBreaches().map((breach) => GUARD_LABELS[breach]),
  );

  readonly setupOptions = computed(() => {
    taxonomyVersion();
    return activeSetupOptions(SETUPS);
  });
  readonly checks = signal<RuleCheck[]>([]);
  readonly checklistTouched = signal(false);
  readonly emotionOptions = computed(() => {
    taxonomyVersion();
    return taxonomyOptions('emotion', EMOTIONS);
  });
  readonly mistakeOptions = computed(() => {
    taxonomyVersion();
    return taxonomyOptions('mistake', MISTAKES);
  });
  readonly tagOptions = computed(() =>
    tagOptionsWithTrades(this.store.trades()),
  );

  private syncChecklist(setup: string): void {
    this.checks.set(getPlaybook(setup).rules.map((text) => ({ text, followed: false })));
    this.checklistTouched.set(false);
  }

  toggleCheck(index: number): void {
    this.checks.update((current) =>
      current.map((check, i) =>
        i === index ? { ...check, followed: !check.followed } : check,
      ),
    );
    this.checklistTouched.set(true);
  }

  readonly formatCompliance = (value: number | null): string =>
    value === null ? '' : `${value.toFixed(2)}%`;

  // Presentation-only formatters for the history table: thousands grouping so
  // a desk scans numbers at speed; values are the same derivations.
  private readonly priceFormat = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 4,
  });
  // en-US currency style already places a loss as "-$100.00", never "$-100.00".
  private readonly moneyFormat = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // Prices keep their own precision (forex runs 4 decimals); no cents padding.
  readonly formatPrice = (value: number | null): string =>
    value === null ? '—' : this.priceFormat.format(value);

  // Money columns read as dollars: grouping plus fixed cents.
  readonly formatMoney = (value: number): string =>
    this.moneyFormat.format(value);

  readonly formatSignedDollars = formatSignedDollars;

  // R-Multiple carries its unit and sign; risked 0 means "no R", shown blank-style.
  readonly formatR = (value: number, risked: number): string =>
    risked === 0 ? '—' : `${value > 0 ? '+' : ''}${value.toFixed(2)}R`;

  parseTags(value: string): string[] {
    return normalizeTags(value.split(','));
  }

  readonly rows = computed(() => this.store.activeByCloseDesc());

  // Row-expansion state for the history table. Owned here (not via
  // pRowToggler) because the zoneless harness never sees PrimeNG's in-place
  // mutation of expandedRowKeys: a signal write re-binds the input and renders
  // the expandedrow template (same idiom as Journal, #37).
  readonly expandedTradeRows = signal<Record<string, boolean>>({});

  toggleTradeRow(id: string): void {
    this.expandedTradeRows.update((keys) => {
      const next = { ...keys };
      if (next[id]) {
        delete next[id];
      } else {
        next[id] = true;
      }
      return next;
    });
  }

  readonly form = this.fb.nonNullable.group({
    asset: ['', Validators.required],
    market: ['Stocks' as Market, Validators.required],
    side: ['Long' as Side, Validators.required],
    quantity: [1, [Validators.required, Validators.min(1e-9)]],
    multiplier: [1, [Validators.required, Validators.min(1e-9)]],
    entryPrice: [0, [Validators.required, positivePriceValidator]],
    exitPrice: [0, [Validators.required, positivePriceValidator]],
    stopPrice: this.fb.control<number | null>(null),
    takePrice: this.fb.control<number | null>(null),
    riskedAmount: this.fb.control<number | null>(null),
    fees: [0, [Validators.required, Validators.min(0)]],
    openedAt: ['', Validators.required],
    closedAt: ['', Validators.required],
    setup: ['Breakout' as Setup, Validators.required],
    emotionBefore: ['Calm' as Emotion, Validators.required],
    emotionAfter: ['Calm' as Emotion, Validators.required],
    mistake: ['None-followed-plan' as Mistake, Validators.required],
    grade: this.fb.control<Grade | null>(null),
    chartUrl: ['', chartUrlValidator],
    notes: [''],
    tags: [''],
  });

  constructor() {
    this.form.controls.market.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((market) => {
        this.form.controls.multiplier.setValue(MARKET_MULTIPLIERS[market]);
      });
    this.syncChecklist(this.form.controls.setup.value);
    this.form.controls.setup.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((setup) => {
        this.syncChecklist(setup);
      });
    effect(() => {
      const saved = this.lastSaved();
      if (saved && this.store.activeId() !== saved.trade.portfolioId) {
        this.dismissUndo();
      }
    });
  }

  onSubmit(): void {
    if (!this.store.canLog()) return;
    this.submitAttempted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      // Chart URL is the only validated field behind the phone disclosure;
      // reveal it so a blocking error is never hidden below lg.
      if (this.form.controls.chartUrl.invalid) {
        this.moreDetailsOpen.set(true);
      }
      return;
    }
    const v = this.form.getRawValue();
    const tags = this.parseTags(v.tags ?? '');
    for (const tag of tags) addTaxonomyValue('tag', tag);
    const input: TradeInput = {
      asset: v.asset.trim(),
      market: v.market,
      side: v.side,
      quantity: Number(v.quantity),
      multiplier: Number(v.multiplier),
      entryPrice: Number(v.entryPrice),
      exitPrice: Number(v.exitPrice),
      stopPrice: v.stopPrice === null ? null : Number(v.stopPrice),
      takePrice: v.takePrice === null ? null : Number(v.takePrice),
      riskedAmount: v.riskedAmount === null ? undefined : Number(v.riskedAmount),
      fees: Number(v.fees),
      openedAt: new Date(v.openedAt).toISOString(),
      closedAt: new Date(v.closedAt).toISOString(),
      setup: v.setup,
      emotionBefore: v.emotionBefore,
      emotionAfter: v.emotionAfter,
      mistake: v.mistake,
      grade: v.grade ?? '',
      rules: this.checklistTouched() ? [...this.checks()] : undefined,
      chartUrl: v.chartUrl ?? '',
      notes: v.notes ?? '',
      tags,
    };
    const trade = this.store.addTrade(input);
    this.lastSaved.set({
      trade,
      draft: v,
      checks: [...this.checks()],
      checklistTouched: this.checklistTouched(),
    });
    this.toast.clear();
    this.toast.add({
      severity: 'success',
      summary: 'Trade logged',
      life: 8000,
    });
    this.syncChecklist(this.form.controls.setup.value);
    this.form.reset({
      market: 'Stocks',
      side: 'Long',
      quantity: 1,
      multiplier: 1,
      fees: 0,
      setup: 'Breakout',
      emotionBefore: 'Calm',
      emotionAfter: 'Calm',
      mistake: 'None-followed-plan',
      grade: null,
      chartUrl: '',
      notes: '',
      tags: '',
    });
    // Capture done: collapse back so the working surface (history) returns.
    this.moreDetailsOpen.set(false);
    this.logFormOpen.set(false);
    this.submitAttempted.set(false);
  }
}
