import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
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
import { provideIcons } from '@ng-icons/core';
import { lucideArrowDownUp } from '@ng-icons/lucide';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { CardModule } from 'primeng/card';
import { ChipModule } from 'primeng/chip';
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
  TradeInput,
} from './trade';
import { isValidChartUrl, normalizeTags } from './trade-math';
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

@Component({
  imports: [ReactiveFormsModule, FormsModule, DatePipe, TableModule, ButtonModule, InputTextModule, InputNumberModule, CheckboxModule, MessageModule, SelectModule, CardModule, ChipModule, TagModule, TextareaModule, ToastModule, EmptyState, FilterBar, PageHero],
  providers: [
    provideIcons({ lucideArrowDownUp }),
  ],
  selector: 'app-trades',
  styleUrl: './trades.css',
  templateUrl: './trades.html',
})
export class Trades {
  readonly store = inject(TradesStore);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly markets: readonly Market[] = MARKETS;

  readonly gradeOptions: { label: string; value: Grade | '' }[] = [
    { label: '—', value: '' },
    ...GRADES.map((grade) => ({ label: grade, value: grade as Grade | '' })),
  ];

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

  parseTags(value: string): string[] {
    return normalizeTags(value.split(','));
  }

  readonly rows = computed(() => this.store.activeByCloseDesc());

  readonly form = this.fb.nonNullable.group({
    asset: ['', Validators.required],
    market: ['Stocks' as Market, Validators.required],
    side: ['Long' as Side, Validators.required],
    quantity: [1, [Validators.required, Validators.min(1e-9)]],
    multiplier: [1, [Validators.required, Validators.min(1e-9)]],
    entryPrice: [0, Validators.required],
    exitPrice: [0, Validators.required],
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
    grade: ['' as Grade | ''],
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
  }

  goToForm(): void {
    document.getElementById('log-trade')?.scrollIntoView?.({ behavior: 'smooth' });
  }

  onSubmit(): void {
    if (!this.store.canLog()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
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
      grade: v.grade,
      rules: this.checklistTouched() ? [...this.checks()] : undefined,
      chartUrl: v.chartUrl ?? '',
      notes: v.notes ?? '',
      tags,
    };
    this.store.addTrade(input);
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
      grade: '',
      chartUrl: '',
      notes: '',
      tags: '',
    });
  }
}
