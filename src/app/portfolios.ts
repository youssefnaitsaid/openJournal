import { DEFAULT_STARTING_BALANCE, loadStartingBalance } from './settings';

export const DEFAULT_PORTFOLIO_ID = 'default';
export const ALL_PORTFOLIOS_ID = 'all';

export const PORTFOLIOS_STORAGE_KEY = 'openjournal-portfolios';
export const ACTIVE_PORTFOLIO_STORAGE_KEY = 'openjournal-active-portfolio';

export interface Portfolio {
  id: string;
  name: string;
  startingBalance: number;
}

function defaultPortfolio(): Portfolio {
  return {
    id: DEFAULT_PORTFOLIO_ID,
    name: 'Main',
    startingBalance: loadStartingBalance(),
  };
}

export function savePortfolios(list: readonly Portfolio[]): void {
  localStorage.setItem(PORTFOLIOS_STORAGE_KEY, JSON.stringify(list));
}

export function loadActiveId(): string {
  const raw = localStorage.getItem(ACTIVE_PORTFOLIO_STORAGE_KEY);
  if (raw === null || raw.trim() === '') return ALL_PORTFOLIOS_ID;
  return raw;
}

export function saveActiveId(id: string): void {
  localStorage.setItem(ACTIVE_PORTFOLIO_STORAGE_KEY, id);
}

export interface PortfolioMutation {
  list: Portfolio[];
  error: string | null;
}

export function createPortfolio(list: readonly Portfolio[], name: string): PortfolioMutation {
  const trimmed = name.trim();
  if (trimmed === '') return { list: [...list], error: 'Portfolio name must not be blank.' };
  if (list.some((p) => p.name === trimmed)) {
    return { list: [...list], error: `Portfolio "${trimmed}" already exists.` };
  }
  return {
    list: [
      ...list,
      { id: crypto.randomUUID(), name: trimmed, startingBalance: DEFAULT_STARTING_BALANCE },
    ],
    error: null,
  };
}

export function renamePortfolio(
  list: readonly Portfolio[],
  id: string,
  name: string,
): PortfolioMutation {
  const trimmed = name.trim();
  if (trimmed === '') return { list: [...list], error: 'Portfolio name must not be blank.' };
  if (!list.some((p) => p.id === id)) return { list: [...list], error: 'Portfolio not found.' };
  if (list.some((p) => p.id !== id && p.name === trimmed)) {
    return { list: [...list], error: `Portfolio "${trimmed}" already exists.` };
  }
  return {
    list: list.map((p) => (p.id === id ? { ...p, name: trimmed } : p)),
    error: null,
  };
}

export function deletePortfolio(list: readonly Portfolio[], id: string): PortfolioMutation {
  if (!list.some((p) => p.id === id)) return { list: [...list], error: 'Portfolio not found.' };
  if (list.length <= 1) {
    return { list: [...list], error: 'At least one Portfolio must remain.' };
  }
  return { list: list.filter((p) => p.id !== id), error: null };
}

export function startingBalanceOf(list: readonly Portfolio[], id: string): number {
  return list.find((p) => p.id === id)?.startingBalance ?? DEFAULT_STARTING_BALANCE;
}

export function setStartingBalance(
  list: readonly Portfolio[],
  id: string,
  value: number,
): Portfolio[] {
  if (!Number.isFinite(value) || value < 0) return [...list];
  return list.map((p) => (p.id === id ? { ...p, startingBalance: value } : p));
}

export function allStartingBalance(list: readonly Portfolio[]): number {
  return list.reduce((sum, p) => sum + p.startingBalance, 0);
}

export function resolveActiveId(id: string, list: readonly Portfolio[]): string {
  if (id === ALL_PORTFOLIOS_ID) return ALL_PORTFOLIOS_ID;
  return list.some((p) => p.id === id) ? id : ALL_PORTFOLIOS_ID;
}

export function loadPortfolios(): Portfolio[] {
  const raw = localStorage.getItem(PORTFOLIOS_STORAGE_KEY);
  if (raw === null) return [defaultPortfolio()];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return [defaultPortfolio()];
    const out: Portfolio[] = [];
    for (const entry of parsed) {
      if (typeof entry !== 'object' || entry === null) continue;
      const record = entry as Partial<Portfolio>;
      if (typeof record.id !== 'string' || record.id.trim() === '') continue;
      if (typeof record.name !== 'string' || record.name.trim() === '') continue;
      const balance = Number(record.startingBalance);
      out.push({
        id: record.id,
        name: record.name,
        startingBalance:
          Number.isFinite(balance) && balance >= 0 ? balance : DEFAULT_STARTING_BALANCE,
      });
    }
    return out.length === 0 ? [defaultPortfolio()] : out;
  } catch {
    return [defaultPortfolio()];
  }
}
