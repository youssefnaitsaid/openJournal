import type { Trade } from './features/trades/trade';
import { DEFAULT_PORTFOLIO_ID } from './portfolios';

export interface DailyGuards {
  maxLoss: number | null;
  maxTrades: number | null;
  stopTime: string | null;
}

export interface WeeklyGuards {
  maxLoss: number | null;
  maxTrades: number | null;
}

export interface GuardSettings {
  daily: DailyGuards;
  weekly: WeeklyGuards;
}

export const UNSET_GUARDS: GuardSettings = {
  daily: { maxLoss: null, maxTrades: null, stopTime: null },
  weekly: { maxLoss: null, maxTrades: null },
};

export function hasAnyGuard(settings: GuardSettings): boolean {
  return (
    settings.daily.maxLoss !== null ||
    settings.daily.maxTrades !== null ||
    settings.daily.stopTime !== null ||
    settings.weekly.maxLoss !== null ||
    settings.weekly.maxTrades !== null
  );
}

export type GuardBreach =
  | 'daily-loss'
  | 'daily-count'
  | 'daily-stop'
  | 'weekly-loss'
  | 'weekly-count';

export const GUARD_LABELS: Record<GuardBreach, string> = {
  'daily-loss': 'Daily loss Guard',
  'daily-count': 'Daily trade count Guard',
  'daily-stop': 'Daily stop time Guard',
  'weekly-loss': 'Weekly loss Guard',
  'weekly-count': 'Weekly trade count Guard',
};

export const GUARDS_STORAGE_KEY = 'openjournal-guards';

function positiveOrUnset(value: unknown): number | null {
  if (typeof value !== 'number') return null;
  return Number.isFinite(value) && value > 0 ? value : null;
}

function stopTimeOrUnset(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  return stopTimeMinutes(value) === null ? null : value.trim();
}

export function normalizeGuardSettings(value: unknown): GuardSettings {
  if (typeof value !== 'object' || value === null)
    return structuredClone(UNSET_GUARDS);
  const { daily, weekly } = value as {
    daily?: Partial<DailyGuards>;
    weekly?: Partial<WeeklyGuards>;
  };
  return {
    daily: {
      maxLoss: positiveOrUnset(daily?.maxLoss),
      maxTrades: positiveOrUnset(daily?.maxTrades),
      stopTime: stopTimeOrUnset(daily?.stopTime),
    },
    weekly: {
      maxLoss: positiveOrUnset(weekly?.maxLoss),
      maxTrades: positiveOrUnset(weekly?.maxTrades),
    },
  };
}

export function loadGuardMap(): Record<string, GuardSettings> {
  const raw = localStorage.getItem(GUARDS_STORAGE_KEY);
  if (raw === null) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
      return {};
    const record = parsed as Record<string, unknown>;
    if ('daily' in record || 'weekly' in record) {
      return { [DEFAULT_PORTFOLIO_ID]: normalizeGuardSettings(parsed) };
    }
    const out: Record<string, GuardSettings> = {};
    for (const [key, entry] of Object.entries(record)) {
      out[key] = normalizeGuardSettings(entry);
    }
    return out;
  } catch {
    return {};
  }
}

export function saveGuardMap(map: Record<string, GuardSettings>): void {
  localStorage.setItem(GUARDS_STORAGE_KEY, JSON.stringify(map));
}

export function guardsFor(
  map: Record<string, GuardSettings>,
  portfolioId: string,
): GuardSettings {
  return structuredClone(map[portfolioId] ?? UNSET_GUARDS);
}

export function setGuardSettings(
  map: Record<string, GuardSettings>,
  portfolioId: string,
  settings: GuardSettings,
): Record<string, GuardSettings> {
  const next = { ...map, [portfolioId]: settings };
  saveGuardMap(next);
  return next;
}

export function loadGuards(): GuardSettings {
  return guardsFor(loadGuardMap(), DEFAULT_PORTFOLIO_ID);
}

export function saveGuards(settings: GuardSettings): void {
  setGuardSettings(loadGuardMap(), DEFAULT_PORTFOLIO_ID, settings);
}

export interface GuardFormInput {
  dailyMaxLoss: string;
  dailyMaxTrades: string;
  stopTime: string;
  weeklyMaxLoss: string;
  weeklyMaxTrades: string;
}

export interface GuardValidation {
  settings: GuardSettings;
  errors: string[];
}

function positiveField(raw: string, label: string): { value: number | null; error: string | null } {
  const trimmed = raw.trim();
  if (trimmed === '') return { value: null, error: null };
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) {
    return { value: null, error: `${label} must be a positive amount, or blank to turn it off.` };
  }
  return { value: value === 0 ? null : value, error: null };
}

export function toGuardFormInput(settings: GuardSettings): GuardFormInput {
  const num = (value: number | null): string => (value === null ? '' : String(value));
  return {
    dailyMaxLoss: num(settings.daily.maxLoss),
    dailyMaxTrades: num(settings.daily.maxTrades),
    stopTime: settings.daily.stopTime ?? '',
    weeklyMaxLoss: num(settings.weekly.maxLoss),
    weeklyMaxTrades: num(settings.weekly.maxTrades),
  };
}

export function validateGuardInput(raw: GuardFormInput): GuardValidation {
  const errors: string[] = [];
  const loss = positiveField(raw.dailyMaxLoss, GUARD_LABELS['daily-loss']);
  const count = positiveField(raw.dailyMaxTrades, GUARD_LABELS['daily-count']);
  const weeklyLoss = positiveField(raw.weeklyMaxLoss, GUARD_LABELS['weekly-loss']);
  const weeklyCount = positiveField(raw.weeklyMaxTrades, GUARD_LABELS['weekly-count']);
  for (const field of [loss, count, weeklyLoss, weeklyCount]) {
    if (field.error !== null) errors.push(field.error);
  }
  const stopTrimmed = raw.stopTime.trim();
  let stopTime: string | null = null;
  if (stopTrimmed !== '') {
    if (stopTimeMinutes(stopTrimmed) === null) {
      errors.push(`${GUARD_LABELS['daily-stop']} must be a valid 24-hour time like 15:30, or blank to turn it off.`);
    } else {
      stopTime = stopTrimmed;
    }
  }
  return {
    settings: {
      daily: { maxLoss: loss.value, maxTrades: count.value, stopTime },
      weekly: { maxLoss: weeklyLoss.value, maxTrades: weeklyCount.value },
    },
    errors,
  };
}

export interface DayGuardStatus {
  empty: boolean;
  breached: GuardBreach[];
  inside: boolean;
}

export interface WeekGuardStatus {
  empty: boolean;
  breached: GuardBreach[];
  inside: boolean;
}

function toDayKey(closedAt: string): string {
  return closedAt.slice(0, 10);
}

export function weekKeyOfDay(day: string): string {
  const date = new Date(`${day}T00:00:00.000Z`);
  const weekday = date.getUTCDay();
  const backToMonday = (weekday + 6) % 7;
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() - backToMonday);
  return monday.toISOString().slice(0, 10);
}

export function evaluateWeekGuards(
  weekTrades: readonly Trade[],
  settings: GuardSettings,
): WeekGuardStatus {
  const breached: GuardBreach[] = [];
  if (weekTrades.length === 0) return { empty: true, breached, inside: true };
  const { maxLoss, maxTrades } = settings.weekly;
  if (maxLoss !== null && maxLoss > 0) {
    const weekNet = weekTrades.reduce((sum, t) => sum + t.net, 0);
    if (weekNet <= -maxLoss) breached.push('weekly-loss');
  }
  if (maxTrades !== null && maxTrades > 0 && weekTrades.length > maxTrades) {
    breached.push('weekly-count');
  }
  return { empty: false, breached, inside: breached.length === 0 };
}

export interface GuardEvaluation {
  days: Map<string, DayGuardStatus>;
  weeks: Map<string, WeekGuardStatus>;
}

export function evaluateGuards(
  trades: readonly Trade[],
  settings: GuardSettings,
): GuardEvaluation {
  const byDay = new Map<string, Trade[]>();
  const byWeek = new Map<string, Trade[]>();
  for (const t of trades) {
    const day = toDayKey(t.closedAt);
    const dayList = byDay.get(day);
    if (dayList) dayList.push(t);
    else byDay.set(day, [t]);
    const week = weekKeyOfDay(day);
    const weekList = byWeek.get(week);
    if (weekList) weekList.push(t);
    else byWeek.set(week, [t]);
  }
  const days = new Map<string, DayGuardStatus>();
  for (const [day, dayTrades] of byDay) {
    days.set(day, evaluateDayGuards(dayTrades, settings));
  }
  const weeks = new Map<string, WeekGuardStatus>();
  for (const [week, weekTrades] of byWeek) {
    weeks.set(week, evaluateWeekGuards(weekTrades, settings));
  }
  return { days, weeks };
}

export function stopTimeMinutes(value: string | null): number | null {
  if (value === null) return null;
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (match === null) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function evaluateDayGuards(
  dayTrades: readonly Trade[],
  settings: GuardSettings,
): DayGuardStatus {
  const breached: GuardBreach[] = [];
  if (dayTrades.length === 0) return { empty: true, breached, inside: true };
  const { maxLoss, maxTrades, stopTime } = settings.daily;
  if (maxLoss !== null && maxLoss > 0) {
    const dayNet = dayTrades.reduce((sum, t) => sum + t.net, 0);
    if (dayNet <= -maxLoss) breached.push('daily-loss');
  }
  if (maxTrades !== null && maxTrades > 0 && dayTrades.length > maxTrades) {
    breached.push('daily-count');
  }
  const cutoff = stopTimeMinutes(stopTime);
  if (cutoff !== null) {
    const late = dayTrades.some((t) => {
      const closed = new Date(t.closedAt);
      return closed.getHours() * 60 + closed.getMinutes() > cutoff;
    });
    if (late) breached.push('daily-stop');
  }
  return { empty: false, breached, inside: breached.length === 0 };
}
