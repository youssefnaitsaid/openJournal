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
import { lucideArrowDownUp, lucideTags, lucideTableProperties } from '@ng-icons/lucide';
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
  Setup,
  Side,
  Trade,
  TradeInput,
} from './trade';
import { isValidChartUrl, normalizeTags } from './trade-math';
import { TradesStore } from './trades-store';
import {
  addTaxonomyValue,
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
    provideIcons({ lucideArrowDownUp, lucideTags, lucideTableProperties }),
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

  readonly setupOptions = computed(() => {
    taxonomyVersion();
    return taxonomyOptions('setup', SETUPS);
  });
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
      chartUrl: v.chartUrl ?? '',
      notes: v.notes ?? '',
      tags,
    };
    this.store.addTrade(input);
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
