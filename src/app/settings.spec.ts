import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_STARTING_BALANCE,
  loadStartingBalance,
  saveStartingBalance,
} from './settings';

describe('starting balance setting', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to 10,000 USD with nothing stored', () => {
    expect(loadStartingBalance()).toBe(DEFAULT_STARTING_BALANCE);
  });

  it('round-trips a saved balance', () => {
    saveStartingBalance(25000);
    expect(loadStartingBalance()).toBe(25000);
  });

  it('falls back to default on corrupt input', () => {
    localStorage.setItem('openjournal-starting-balance', 'junk');
    expect(loadStartingBalance()).toBe(DEFAULT_STARTING_BALANCE);
  });
});
