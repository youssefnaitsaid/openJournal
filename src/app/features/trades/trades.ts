import { Component, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import {
  EMOTIONS,
  MARKETS,
  MISTAKES,
  SETUPS,
} from './trade';
import type {
  Emotion,
  Market,
  Mistake,
  Setup,
  Side,
  TradeInput,
} from './trade';
import { isValidChartUrl } from './trade-math';
import { TradesStore } from './trades-store';
import {
  addTaxonomyValue,
  taxonomyOptions,
} from '../journal/taxonomy';
import type { TaxonomyKind } from '../journal/taxonomy';

function chartUrlValidator(
  control: AbstractControl<string | null>,
): ValidationErrors | null {
  return isValidChartUrl(control.value ?? '') ? null : { chartUrl: true };
}

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-trades',
  styleUrl: './trades.css',
  templateUrl: './trades.html',
})
export class Trades {
  readonly store = inject(TradesStore);
  private readonly fb = inject(FormBuilder);

  readonly markets: readonly Market[] = MARKETS;

  private readonly taxonomyVersion = signal(0);

  readonly setupOptions = computed(() => {
    this.taxonomyVersion();
    return taxonomyOptions('setup', SETUPS);
  });
  readonly emotionOptions = computed(() => {
    this.taxonomyVersion();
    return taxonomyOptions('emotion', EMOTIONS);
  });
  readonly mistakeOptions = computed(() => {
    this.taxonomyVersion();
    return taxonomyOptions('mistake', MISTAKES);
  });

  addCustom(kind: TaxonomyKind, value: string): void {
    addTaxonomyValue(kind, value);
    this.taxonomyVersion.update((v) => v + 1);
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

  readonly rows = computed(() => this.store.byCloseDesc());

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
    chartUrl: ['', chartUrlValidator],
    notes: [''],
  });

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
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
      chartUrl: v.chartUrl ?? '',
      notes: v.notes ?? '',
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
      chartUrl: '',
      notes: '',
    });
  }
}
