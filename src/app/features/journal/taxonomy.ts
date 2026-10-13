import { signal } from '@angular/core';
import type { Trade } from '../trades/trade';

export type TaxonomyKind = 'setup' | 'emotion' | 'mistake' | 'tag';

export interface CustomTaxonomy {
  setup: string[];
  emotion: string[];
  mistake: string[];
  tag: string[];
}

const STORAGE_KEY = 'openjournal-taxonomy';

const EMPTY: CustomTaxonomy = { setup: [], emotion: [], mistake: [], tag: [] };

export const taxonomyVersion = signal(0);

function asList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === 'string')
    : [];
}

export function loadCustomTaxonomy(): CustomTaxonomy {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) return { ...EMPTY };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return { ...EMPTY };
    const record = parsed as Partial<Record<TaxonomyKind, unknown>>;
    return {
      setup: asList(record.setup),
      emotion: asList(record.emotion),
      mistake: asList(record.mistake),
      tag: asList(record.tag),
    };
  } catch {
    return { ...EMPTY };
  }
}

export function addTaxonomyValue(kind: TaxonomyKind, value: string): void {
  const trimmed = value.trim();
  if (trimmed === '') return;
  const current = loadCustomTaxonomy();
  if (current[kind].includes(trimmed)) return;
  current[kind] = [...current[kind], trimmed];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  taxonomyVersion.update((v) => v + 1);
}

export function taxonomyOptions(
  kind: TaxonomyKind,
  seeds: readonly string[],
): string[] {
  const customs = loadCustomTaxonomy()[kind].filter((v) => !seeds.includes(v));
  return [...seeds, ...customs];
}

export function tagOptionsWithTrades(trades: readonly Trade[]): string[] {
  taxonomyVersion();
  const grown = taxonomyOptions('tag', []);
  const seen = new Set(grown);
  const fromTrades: string[] = [];
  for (const t of trades) {
    for (const tag of t.tags ?? []) {
      if (!seen.has(tag)) {
        seen.add(tag);
        fromTrades.push(tag);
      }
    }
  }
  return [...grown, ...fromTrades];
}
