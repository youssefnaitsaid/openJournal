import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowDownUp, lucideShieldAlert, lucideTags, lucideTableProperties } from '@ng-icons/lucide';
import { GUARD_LABELS, evaluateGuards, loadGuards } from '../../guards';
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
import { TradesStore } from './trades-store';
import {
  activeSetupOptions,
  addTaxonomyValue,
  getPlaybook,
  playbookOptions,
  setPlaybookArchived,
  setPlaybookRules,
  tagOptionsWithTrades,
  taxonomyOptions,
  taxonomyVersion,
} from '../journal/taxonomy';
import type { TaxonomyKind } from '../journal/taxonomy';

function chartUrlValidator(
  control: AbstractControl<string | null>,
): ValidationErrors | null {
  return isValidChartUrl(control.value ?? '') ? null : { chartUrl: true };
}

@Component({
  imports: [ReactiveFormsModule, DatePipe, NgIcon, EmptyState, FilterBar, PageHero],
  providers: [
    provideIcons({ lucideArrowDownUp, lucideShieldAlert, lucideTags, lucideTableProperties }),
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

  readonly grades: readonly Grade[] = GRADES;

  readonly gradeFilter = signal<Grade | ''>('');
  readonly needsReview = signal(false);

  readonly guards = signal(loadGuards());

  readonly todayGuardBreaches = computed((): readonly GuardBreach[] => {
    const today = new Date().toISOString().slice(0, 10);
    return evaluateGuards(this.store.trades(), this.guards()).days.get(today)?.breached ?? [];
  });

  readonly todayGuardLabels = computed(() =>
    this.todayGuardBreaches().map((breach) => GUARD_LABELS[breach]),
  );

  readonly setupOptions = computed(() => {
    taxonomyVersion();
    return activeSetupOptions(SETUPS);
  });
  readonly archivedPlaybooks = computed(() => {
    taxonomyVersion();
    return playbookOptions(SETUPS)
      .filter((p) => p.archived)
      .map((p) => p.name);
  });
  readonly playbook = computed(() => {
    taxonomyVersion();
    // Track the select so rule edits + setup switches refresh the checklist.
    const setup = this.form?.controls.setup.value ?? 'Breakout';
    return { setup, ...getPlaybook(setup) };
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

  addCustom(kind: TaxonomyKind, value: string): void {
    addTaxonomyValue(kind, value);
  }

  addCustomSetup(value: string): void {
    const trimmed = value.trim();
    this.addCustom('setup', trimmed);
    if (trimmed !== '') this.form.controls.setup.setValue(trimmed);
  }

  addCustomMistake(value: string): void {
    const trimmed = value.trim();
    this.addCustom('mistake', trimmed);
    if (trimmed !== '') this.form.controls.mistake.setValue(trimmed);
  }

  addCustomTag(value: string): void {
    const tags = normalizeTags(value.split(','));
    for (const tag of tags) this.addCustom('tag', tag);
    if (tags.length > 0) this.form.controls.tags.setValue(tags.join(', '));
  }

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

  addRule(value: string): void {
    const setup = this.form.controls.setup.value;
    const previous = getPlaybook(setup);
    const trimmed = value.trim();
    if (trimmed === '') return;
    setPlaybookRules(setup, [...previous.rules, trimmed]);
    const next = getPlaybook(setup).rules;
    const kept = new Map(this.checks().map((c) => [c.text, c.followed]));
    this.checks.set(next.map((text) => ({ text, followed: kept.get(text) ?? false })));
  }

  removeRule(index: number): void {
    const setup = this.form.controls.setup.value;
    const previous = getPlaybook(setup);
    setPlaybookRules(
      setup,
      previous.rules.filter((_, i) => i !== index),
    );
    const removed = previous.rules[index];
    if (removed !== undefined) {
      this.checks.set(this.checks().filter((c) => c.text !== removed));
    }
  }

  togglePlaybookArchived(): void {
    const setup = this.form.controls.setup.value;
    const previous = getPlaybook(setup);
    setPlaybookArchived(setup, !previous.archived);
    if (!previous.archived) {
      const fallback = activeSetupOptions(SETUPS)[0] ?? 'Breakout';
      this.form.controls.setup.setValue(fallback);
    }
  }

  unarchivePlaybook(name: string): void {
    setPlaybookArchived(name, false);
    this.form.controls.setup.setValue(name);
  }

  readonly formatCompliance = (value: number | null): string =>
    value === null ? '' : `${value.toFixed(2)}%`;

  parseTags(value: string): string[] {
    return normalizeTags(value.split(','));
  }

  readonly rows = computed(() => {
    const all = this.store.filteredByCloseDesc();
    if (this.needsReview()) {
      const reviewRank = (t: Trade): number => (t.grade === 'D' ? 0 : 1);
      const selected = this.gradeFilter();
      const inReview = all.filter((t) => t.grade === 'C' || t.grade === 'D');
      const list =
        selected === '' ? inReview : inReview.filter((t) => t.grade === selected);
      return [...list].sort(
        (a, b) =>
          reviewRank(a) - reviewRank(b) ||
          +new Date(b.closedAt) - +new Date(a.closedAt),
      );
    }
    const grade = this.gradeFilter();
    if (grade === '') return all;
    return all.filter((t) => t.grade === grade);
  });

  toggleReview(): void {
    const next = !this.needsReview();
    this.needsReview.set(next);
    if (!next) this.gradeFilter.set('');
  }

  onGradeFilterChange(event: Event): void {
    const el = event.target as HTMLSelectElement | null;
    if (el) this.gradeFilter.set(el.value as Grade | '');
  }

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
