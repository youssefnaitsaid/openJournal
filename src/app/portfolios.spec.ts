import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_STARTING_BALANCE } from './settings';
import { ALL_PORTFOLIOS_ID, DEFAULT_PORTFOLIO_ID, allStartingBalance, createPortfolio, deletePortfolio, loadActiveId, loadPortfolios, renamePortfolio, resolveActiveId, saveActiveId, savePortfolios, setStartingBalance, startingBalanceOf } from './portfolios';
import type { Portfolio } from './portfolios';

describe('portfolios', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to a single Main portfolio at the default balance', () => {
    expect(loadPortfolios()).toEqual([
      { id: DEFAULT_PORTFOLIO_ID, name: 'Main', startingBalance: DEFAULT_STARTING_BALANCE },
    ]);
  });

  it('round-trips saved portfolios', () => {
    savePortfolios([
      { id: 'a', name: 'ES futures', startingBalance: 5000 },
      { id: 'b', name: 'Swing', startingBalance: 20000 },
    ]);
    expect(loadPortfolios()).toEqual([
      { id: 'a', name: 'ES futures', startingBalance: 5000 },
      { id: 'b', name: 'Swing', startingBalance: 20000 },
    ]);
  });

  it('falls back to Main on corrupt or empty input', () => {
    localStorage.setItem('openjournal-portfolios', 'junk');
    expect(loadPortfolios()).toEqual([
      { id: DEFAULT_PORTFOLIO_ID, name: 'Main', startingBalance: DEFAULT_STARTING_BALANCE },
    ]);
    localStorage.setItem('openjournal-portfolios', '[]');
    expect(loadPortfolios()).toEqual([
      { id: DEFAULT_PORTFOLIO_ID, name: 'Main', startingBalance: DEFAULT_STARTING_BALANCE },
    ]);
  });

  it('defaults the active portfolio to All and round-trips a selection', () => {
    expect(loadActiveId()).toBe(ALL_PORTFOLIOS_ID);
    saveActiveId('a');
    expect(loadActiveId()).toBe('a');
  });

  it('falls back to All on blank stored active id', () => {
    localStorage.setItem('openjournal-active-portfolio', '   ');
    expect(loadActiveId()).toBe(ALL_PORTFOLIOS_ID);
  });

  it('creates a portfolio with a trimmed name at the default balance', () => {
    const start: Portfolio[] = loadPortfolios();
    const { list, error } = createPortfolio(start, '  ES futures  ');
    expect(error).toBeNull();
    expect(list).toHaveLength(2);
    expect(list[1]).toEqual({ id: list[1]!.id, name: 'ES futures', startingBalance: DEFAULT_STARTING_BALANCE });
    expect(list[1]!.id).not.toBe(DEFAULT_PORTFOLIO_ID);
  });

  it('rejects blank and duplicate names exact-case', () => {
    const start: Portfolio[] = loadPortfolios();
    expect(createPortfolio(start, '   ').error).toBe('Portfolio name must not be blank.');
    const { list } = createPortfolio(start, 'Swing');
    expect(createPortfolio(list, 'Swing').error).toBe('Portfolio "Swing" already exists.');
    expect(createPortfolio(list, 'swing').error).toBeNull();
  });

  it('renames a portfolio with the same hygiene, never touching siblings', () => {
    const { list } = createPortfolio(loadPortfolios(), 'Swing');
    const id = list[1]!.id;
    const renamed = renamePortfolio(list, id, '  Funded  ');
    expect(renamed.error).toBeNull();
    expect(renamed.list[1]!.name).toBe('Funded');
    expect(renamePortfolio(list, id, '').error).toBe('Portfolio name must not be blank.');
    expect(renamePortfolio(list, id, 'Main').error).toBe('Portfolio "Main" already exists.');
    expect(renamePortfolio(list, 'missing', 'X').error).toBe('Portfolio not found.');
  });

  it('deletes a portfolio but never the last one', () => {
    const { list } = createPortfolio(loadPortfolios(), 'Swing');
    const id = list[1]!.id;
    const deleted = deletePortfolio(list, id);
    expect(deleted.error).toBeNull();
    expect(deleted.list).toHaveLength(1);
    expect(deletePortfolio(deleted.list, DEFAULT_PORTFOLIO_ID).error).toBe(
      'At least one Portfolio must remain.',
    );
    expect(deletePortfolio(list, 'missing').error).toBe('Portfolio not found.');
  });

  it('reads and updates per-portfolio starting balances, ignoring invalid edits', () => {
    const { list } = createPortfolio(loadPortfolios(), 'Swing');
    const id = list[1]!.id;
    expect(startingBalanceOf(list, id)).toBe(DEFAULT_STARTING_BALANCE);
    const updated = setStartingBalance(list, id, 25000);
    expect(startingBalanceOf(updated, id)).toBe(25000);
    expect(startingBalanceOf(updated, DEFAULT_PORTFOLIO_ID)).toBe(DEFAULT_STARTING_BALANCE);
    expect(setStartingBalance(list, id, -5)).toEqual(list);
    expect(setStartingBalance(list, id, Number.NaN)).toEqual(list);
    expect(startingBalanceOf(list, 'missing')).toBe(DEFAULT_STARTING_BALANCE);
  });

  it('sums member balances for the All anchor', () => {
    const { list } = createPortfolio(loadPortfolios(), 'Swing');
    const updated = setStartingBalance(list, list[1]!.id, 20000);
    expect(allStartingBalance(updated)).toBe(DEFAULT_STARTING_BALANCE + 20000);
  });

  it('resolves unknown active ids to All', () => {
    const list = loadPortfolios();
    expect(resolveActiveId(ALL_PORTFOLIOS_ID, list)).toBe(ALL_PORTFOLIOS_ID);
    expect(resolveActiveId(DEFAULT_PORTFOLIO_ID, list)).toBe(DEFAULT_PORTFOLIO_ID);
    expect(resolveActiveId('gone', list)).toBe(ALL_PORTFOLIOS_ID);
  });
});
