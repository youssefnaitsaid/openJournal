export type TaxonomyKind = 'setup' | 'emotion' | 'mistake';

export interface CustomTaxonomy {
  setup: string[];
  emotion: string[];
  mistake: string[];
}

const STORAGE_KEY = 'openjournal-taxonomy';

const EMPTY: CustomTaxonomy = { setup: [], emotion: [], mistake: [] };

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
}

export function taxonomyOptions(
  kind: TaxonomyKind,
  seeds: readonly string[],
): string[] {
  const customs = loadCustomTaxonomy()[kind].filter((v) => !seeds.includes(v));
  return [...seeds, ...customs];
}
