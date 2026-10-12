export const DEFAULT_STARTING_BALANCE = 10000;

const STORAGE_KEY = 'openjournal-starting-balance';

export function loadStartingBalance(): number {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) return DEFAULT_STARTING_BALANCE;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0
    ? value
    : DEFAULT_STARTING_BALANCE;
}

export function saveStartingBalance(value: number): void {
  localStorage.setItem(STORAGE_KEY, String(value));
}
