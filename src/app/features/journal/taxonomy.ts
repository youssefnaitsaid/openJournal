import { signal } from '@angular/core';
import type { Trade } from '../trades/trade';

export type TaxonomyKind = 'setup' | 'emotion' | 'mistake' | 'tag';

export interface PlaybookMeta {
  rules: string[];
  archived: boolean;
}

export interface PlaybookDefinition {
  name: string;
  rules: string[];
  archived: boolean;
}

export const MAX_PLAYBOOK_RULES = 10;

export interface CustomTaxonomy {
  setup: string[];
  emotion: string[];
  mistake: string[];
  tag: string[];
  playbooks: Record<string, PlaybookMeta>;
}

const STORAGE_KEY = 'openjournal-taxonomy';

const EMPTY: CustomTaxonomy = { setup: [], emotion: [], mistake: [], tag: [], playbooks: {} };

export const taxonomyVersion = signal(0);

function asList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === 'string')
    : [];
}

function asPlaybooks(value: unknown): Record<string, PlaybookMeta> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};
  const out: Record<string, PlaybookMeta> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry !== 'object' || entry === null) continue;
    const record = entry as Partial<PlaybookMeta>;
    out[key] = {
      rules: normalizePlaybookRules(record.rules),
      archived: record.archived === true,
    };
  }
  return out;
}

export function normalizePlaybookRules(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of value) {
    if (typeof entry !== 'string') continue;
    const trimmed = entry.trim();
    if (trimmed === '' || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
    if (out.length >= MAX_PLAYBOOK_RULES) break;
  }
  return out;
}

export function loadCustomTaxonomy(): CustomTaxonomy {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) return { ...EMPTY, playbooks: {} };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null)
      return { ...EMPTY, playbooks: {} };
    const record = parsed as Partial<Record<TaxonomyKind | 'playbooks', unknown>>;
    return {
      setup: asList(record.setup),
      emotion: asList(record.emotion),
      mistake: asList(record.mistake),
      tag: asList(record.tag),
      playbooks: asPlaybooks(record.playbooks),
    };
  } catch {
    return { ...EMPTY, playbooks: {} };
  }
}

function persistTaxonomy(current: CustomTaxonomy): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  taxonomyVersion.update((v) => v + 1);
}

export function addTaxonomyValue(kind: TaxonomyKind, value: string): void {
  const trimmed = value.trim();
  if (trimmed === '') return;
  const current = loadCustomTaxonomy();
  if (current[kind].includes(trimmed)) return;
  current[kind] = [...current[kind], trimmed];
  persistTaxonomy(current);
}

export function getPlaybook(name: string): PlaybookMeta {
  return loadCustomTaxonomy().playbooks[name] ?? { rules: [], archived: false };
}

export function setPlaybookRules(name: string, rules: string[]): void {
  const trimmed = name.trim();
  if (trimmed === '') return;
  const current = loadCustomTaxonomy();
  const previous = current.playbooks[trimmed] ?? { rules: [], archived: false };
  current.playbooks = {
    ...current.playbooks,
    [trimmed]: { rules: normalizePlaybookRules(rules), archived: previous.archived },
  };
  persistTaxonomy(current);
}

export function setPlaybookArchived(name: string, archived: boolean): void {
  const trimmed = name.trim();
  if (trimmed === '') return;
  const current = loadCustomTaxonomy();
  const previous = current.playbooks[trimmed] ?? { rules: [], archived: false };
  current.playbooks = {
    ...current.playbooks,
    [trimmed]: { rules: previous.rules, archived },
  };
  persistTaxonomy(current);
}

export function playbookOptions(seeds: readonly string[]): PlaybookDefinition[] {
  const current = loadCustomTaxonomy();
  const customs = current.setup.filter((v) => !seeds.includes(v));
  return [...seeds, ...customs].map((name) => ({
    name,
    rules: current.playbooks[name]?.rules ?? [],
    archived: current.playbooks[name]?.archived ?? false,
  }));
}

export function activeSetupOptions(seeds: readonly string[]): string[] {
  return playbookOptions(seeds)
    .filter((p) => !p.archived)
    .map((p) => p.name);
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
