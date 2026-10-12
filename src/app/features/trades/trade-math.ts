import type { Side, Trade, TradeInput } from './trade';

export type Outcome = 'Win' | 'Loss' | 'Breakeven';

export function grossPnl(
  side: Side,
  entryPrice: number,
  exitPrice: number,
  quantity: number,
  multiplier: number,
): number {
  const difference = side === 'Long' ? exitPrice - entryPrice : entryPrice - exitPrice;
  return difference * quantity * multiplier;
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
  const distance =
    side === 'Long' ? entryPrice - stopPrice : stopPrice - entryPrice;
  return Math.abs(distance) * quantity * multiplier;
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
