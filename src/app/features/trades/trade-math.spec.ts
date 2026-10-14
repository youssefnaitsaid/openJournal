import { describe, expect, it } from 'vitest';
import {
  classify,
  defaultRisked,
  deriveTrade,
  grossPnl,
  isValidChartUrl,
  netPnl,
  normalizeRuleChecks,
  normalizeTags,
  rMultiple,
} from './trade-math';
import { tradeInput } from './trade-fixtures';
import type { Grade, TradeInput } from './trade';

describe('grossPnl', () => {
  it('derives a Long win from price difference times Quantity times multiplier', () => {
    expect(grossPnl('Long', 100, 110, 10, 1)).toBe(100);
  });

  it('derives a Long loss as negative', () => {
    expect(grossPnl('Long', 110, 100, 10, 1)).toBe(-100);
  });

  it('inverts the difference for a Short win', () => {
    expect(grossPnl('Short', 50, 45, 20, 1)).toBe(100);
  });

  it('derives a Short loss as negative', () => {
    expect(grossPnl('Short', 45, 50, 20, 1)).toBe(-100);
  });

  it('applies the contract multiplier (MES-style)', () => {
    expect(grossPnl('Long', 5000, 5010, 2, 5)).toBe(100);
  });
});

describe('netPnl', () => {
  it('subtracts Fees from Gross P&L', () => {
    expect(netPnl(100, 1.5)).toBe(98.5);
  });
});

describe('defaultRisked', () => {
  it('derives Long risk from entry-to-stop distance', () => {
    expect(defaultRisked('Long', 100, 98, 10, 1)).toBe(20);
  });

  it('derives Short risk from stop-to-entry distance', () => {
    expect(defaultRisked('Short', 50, 55, 20, 1)).toBe(100);
  });

  it('is zero when no stop was set', () => {
    expect(defaultRisked('Long', 100, null, 10, 1)).toBe(0);
  });
});

describe('rMultiple', () => {
  it('divides Net P&L by Risked Amount', () => {
    expect(rMultiple(99, 20)).toBeCloseTo(4.95, 10);
  });

  it('is negative on losses', () => {
    expect(rMultiple(-50, 25)).toBe(-2);
  });

  it('is zero when nothing was risked instead of NaN or Infinity', () => {
    expect(rMultiple(99, 0)).toBe(0);
    expect(rMultiple(-50, 0)).toBe(0);
  });
});

describe('classify', () => {
  it('calls Net above zero a Win, below zero a Loss, exactly zero Breakeven', () => {
    expect(classify(0.01)).toBe('Win');
    expect(classify(-0.01)).toBe('Loss');
    expect(classify(0)).toBe('Breakeven');
  });
});

describe('isValidChartUrl', () => {
  it('allows empty evidence', () => {
    expect(isValidChartUrl('')).toBe(true);
  });

  it('allows http and https chart links', () => {
    expect(isValidChartUrl('https://example.com/chart.png')).toBe(true);
    expect(isValidChartUrl('http://example.com/c')).toBe(true);
  });

  it('rejects non-links and unsafe schemes', () => {
    expect(isValidChartUrl('not-a-url')).toBe(false);
    expect(isValidChartUrl('ftp://example.com/chart.png')).toBe(false);
    expect(isValidChartUrl('javascript:alert(1)')).toBe(false);
  });
});

describe('deriveTrade', () => {
  it('derives Gross, Net, Risked, and R-Multiple from a Trade input', () => {
    const trade = deriveTrade(
      {
        asset: 'AAPL',
        market: 'Stocks',
        side: 'Long',
        quantity: 10,
        multiplier: 1,
        entryPrice: 100,
        exitPrice: 110,
        stopPrice: 98,
        takePrice: 115,
        fees: 1,
        openedAt: '2026-10-01T13:30:00.000Z',
        closedAt: '2026-10-01T14:30:00.000Z',
        setup: 'Breakout',
        emotionBefore: 'Calm',
        emotionAfter: 'Disciplined',
        mistake: 'None-followed-plan',
        grade: '',
        chartUrl: '',
        notes: '',
      },
      'trade-1',
    );
    expect(trade.gross).toBe(100);
    expect(trade.net).toBe(99);
    expect(trade.risked).toBe(20);
    expect(trade.rMultiple).toBeCloseTo(4.95, 10);
    expect(trade.id).toBe('trade-1');
  });

  it('honours a Risked Amount override', () => {
    const trade = deriveTrade(
      {
        asset: 'MES',
        market: 'Futures',
        side: 'Long',
        quantity: 2,
        multiplier: 5,
        entryPrice: 5000,
        exitPrice: 5010,
        stopPrice: 4990,
        takePrice: 5020,
        riskedAmount: 50,
        fees: 2.5,
        openedAt: '2026-10-01T13:30:00.000Z',
        closedAt: '2026-10-01T14:30:00.000Z',
        setup: 'Trend-continuation',
        emotionBefore: 'Confident',
        emotionAfter: 'Calm',
        mistake: 'None-followed-plan',
        grade: 'A',
        chartUrl: '',
        notes: '',
      },
      'trade-2',
    );
    expect(trade.gross).toBe(100);
    expect(trade.net).toBe(97.5);
    expect(trade.risked).toBe(50);
    expect(trade.rMultiple).toBeCloseTo(1.95, 10);
  });

  it('files a Trade into the default portfolio unless told otherwise', () => {
    expect(deriveTrade(tradeInput(), 'p-1').portfolioId).toBe('default');
    expect(deriveTrade(tradeInput({ portfolioId: 'swing' }), 'p-2').portfolioId).toBe(
      'swing',
    );
  });

  it('normalizes a pre-grade Trade input to ungraded', () => {
    const { grade: _dropped, ...legacy } = tradeInput();
    const trade = deriveTrade(legacy, 'legacy-1');
    expect(trade.grade).toBe('');
  });

  it('rejects an invalid Grade to ungraded at the boundary', () => {
    const trade = deriveTrade(
      tradeInput({ grade: 'Z' as Grade }),
      'invalid-grade-1',
    );
    expect(trade.grade).toBe('');
  });
});

describe('normalizeTags', () => {
  it('trims Tags and drops blanks while preserving casing', () => {
    expect(normalizeTags([' FOMC ', '  ', 'earnings'])).toEqual([
      'FOMC',
      'earnings',
    ]);
  });

  it('dedupes exact-case duplicates but keeps casing variants distinct', () => {
    expect(normalizeTags(['FOMC', 'FOMC', 'fomc'])).toEqual(['FOMC', 'fomc']);
  });

  it('reads missing or non-array Tags as empty', () => {
    expect(normalizeTags(undefined)).toEqual([]);
    expect(normalizeTags('FOMC')).toEqual([]);
  });
});

describe('deriveTrade tags', () => {
  it('defaults a pre-tag Trade input to untagged', () => {
    const { tags: _dropped, ...legacy } = tradeInput();
    expect(deriveTrade(legacy, 'legacy-tags-1').tags).toEqual([]);
  });

  it('normalizes provided Tags at the boundary', () => {
    const trade = deriveTrade(
      tradeInput({ tags: [' FOMC ', 'FOMC', ''] }),
      'tags-1',
    );
    expect(trade.tags).toEqual(['FOMC']);
  });
});

describe('normalizeRuleChecks', () => {
  it('trims texts and drops blanks while preserving casing', () => {
    expect(
      normalizeRuleChecks([
        { text: ' risk ≤ 1% ', followed: true },
        { text: '  ', followed: true },
        { text: 'entry on retest', followed: false },
      ]),
    ).toEqual([
      { text: 'risk ≤ 1%', followed: true },
      { text: 'entry on retest', followed: false },
    ]);
  });

  it('dedupes exact-case duplicate rule texts keeping the first check', () => {
    expect(
      normalizeRuleChecks([
        { text: 'risk ≤ 1%', followed: true },
        { text: 'risk ≤ 1%', followed: false },
        { text: 'Risk ≤ 1%', followed: false },
      ]),
    ).toEqual([
      { text: 'risk ≤ 1%', followed: true },
      { text: 'Risk ≤ 1%', followed: false },
    ]);
  });

  it('reads missing or non-array rules as empty', () => {
    expect(normalizeRuleChecks(undefined)).toEqual([]);
    expect(normalizeRuleChecks('risk')).toEqual([]);
  });
});

describe('deriveTrade compliance', () => {
  it('defaults a pre-playbook Trade input to unscored', () => {
    const { rules: _dropped, ...legacy } = tradeInput();
    const trade = deriveTrade(legacy, 'legacy-rules-1');
    expect(trade.rules).toEqual([]);
    expect(trade.compliance).toBeNull();
  });

  it('scores a touched checklist as followed over total times 100', () => {
    const trade = deriveTrade(
      tradeInput({
        rules: [
          { text: 'risk ≤ 1%', followed: true },
          { text: 'entry on retest', followed: true },
          { text: 'no FOMO entry', followed: false },
        ],
      }),
      'compliance-1',
    );
    expect(trade.rules).toEqual([
      { text: 'risk ≤ 1%', followed: true },
      { text: 'entry on retest', followed: true },
      { text: 'no FOMO entry', followed: false },
    ]);
    expect(trade.compliance).toBeCloseTo((2 / 3) * 100, 10);
  });

  it('scores an empty rule list as unscored, never zero', () => {
    const trade = deriveTrade(tradeInput({ rules: [] }), 'compliance-empty-1');
    expect(trade.rules).toEqual([]);
    expect(trade.compliance).toBeNull();
  });

  it('scores all-skipped as zero and all-followed as one hundred', () => {
    const skipped = deriveTrade(
      tradeInput({
        rules: [
          { text: 'a', followed: false },
          { text: 'b', followed: false },
        ],
      }),
      'compliance-zero-1',
    );
    expect(skipped.compliance).toBe(0);
    const full = deriveTrade(
      tradeInput({
        rules: [
          { text: 'a', followed: true },
          { text: 'b', followed: true },
        ],
      }),
      'compliance-full-1',
    );
    expect(full.compliance).toBe(100);
  });
});
