export type Side = 'Long' | 'Short';

export type Market = 'Stocks' | 'Futures' | 'Options' | 'Crypto' | 'Forex';

export type Setup =
  | 'Breakout'
  | 'Pullback'
  | 'Trend-continuation'
  | 'Mean-reversion'
  | 'Gap-and-go'
  | 'News-driven'
  | 'Other'
  | (string & {});

export type Emotion =
  | 'Calm'
  | 'Confident'
  | 'Anxious'
  | 'FOMO'
  | 'Frustrated'
  | 'Disciplined'
  | (string & {});

export type Mistake =
  | 'None-followed-plan'
  | 'Entered-early/late'
  | 'Moved-stop'
  | 'Left-early'
  | 'Overleveraged'
  | 'Revenge-trade'
  | (string & {});

export const MARKETS: readonly Market[] = [
  'Stocks',
  'Futures',
  'Options',
  'Crypto',
  'Forex',
];

export const SETUPS: readonly Setup[] = [
  'Breakout',
  'Pullback',
  'Trend-continuation',
  'Mean-reversion',
  'Gap-and-go',
  'News-driven',
  'Other',
];

export const EMOTIONS: readonly Emotion[] = [
  'Calm',
  'Confident',
  'Anxious',
  'FOMO',
  'Frustrated',
  'Disciplined',
];

export const MISTAKES: readonly Mistake[] = [
  'None-followed-plan',
  'Entered-early/late',
  'Moved-stop',
  'Left-early',
  'Overleveraged',
  'Revenge-trade',
];

export interface TradeInput {
  asset: string;
  market: Market;
  side: Side;
  quantity: number;
  multiplier: number;
  entryPrice: number;
  exitPrice: number;
  stopPrice: number | null;
  takePrice: number | null;
  riskedAmount?: number;
  fees: number;
  openedAt: string;
  closedAt: string;
  setup: Setup;
  emotionBefore: Emotion;
  emotionAfter: Emotion;
  mistake: Mistake;
  chartUrl: string;
  notes: string;
}

export interface Trade extends TradeInput {
  id: string;
  gross: number;
  net: number;
  risked: number;
  rMultiple: number;
}
