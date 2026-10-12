import type { Side, Trade, TradeInput } from './trade';

export type Outcome = 'Win' | 'Loss' | 'Breakeven';

const SIGN: Record<Side, number> = { Long: 1, Short: -1 };

export function grossPnl(
  side: Side,
  entryPrice: number,
  exitPrice: number,
  quantity: number,
  multiplier: number,
): number {
  return SIGN[side] * (exitPrice - entryPrice) * quantity * multiplier;
}

export function netPnl(gross: number, fees: number): number {
  return gross - fees;
}

export function defaultRisked(
  side: Side,
  entryPrice: number,
  stopPrice: number | null,
  quantity: number,
  multiplier: number,
): number {
  if (stopPrice === null) return 0;
  return Math.abs(SIGN[side] * (entryPrice - stopPrice)) * quantity * multiplier;
}

export function rMultiple(net: number, risked: number): number {
  if (risked === 0) return 0;
  return net / risked;
}

export function classify(net: number): Outcome {
  if (net > 0) return 'Win';
  if (net < 0) return 'Loss';
  return 'Breakeven';
}

export function isValidChartUrl(value: string): boolean {
  if (value === '') return true;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function deriveTrade(input: TradeInput, id: string): Trade {
  const gross = grossPnl(
    input.side,
    input.entryPrice,
    input.exitPrice,
    input.quantity,
    input.multiplier,
  );
  const net = netPnl(gross, input.fees);
  const risked =
    input.riskedAmount ??
    defaultRisked(
      input.side,
      input.entryPrice,
      input.stopPrice,
      input.quantity,
      input.multiplier,
    );
  return { ...input, id, gross, net, risked, rMultiple: rMultiple(net, risked) };
}
