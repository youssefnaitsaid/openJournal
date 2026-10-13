import { beforeEach, describe, expect, it } from 'vitest';
import { SETUPS } from '../trades/trade';
import {
  activeSetupOptions,
  addTaxonomyValue,
  getPlaybook,
  loadCustomTaxonomy,
  normalizePlaybookRules,
  playbookOptions,
  setPlaybookArchived,
  setPlaybookRules,
  taxonomyOptions,
} from './taxonomy';

describe('taxonomy', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('offers seed values with nothing custom stored', () => {
    expect(taxonomyOptions('setup', SETUPS)).toEqual([...SETUPS]);
    expect(taxonomyOptions('tag', [])).toEqual([]);
    expect(loadCustomTaxonomy()).toEqual({
      setup: [],
      emotion: [],
      mistake: [],
      tag: [],
      playbooks: {},
    });
  });

  it('keeps a user-added value and merges it after the seeds', () => {
    addTaxonomyValue('setup', 'Opening-drive');
    expect(taxonomyOptions('setup', SETUPS)).toEqual([
      ...SETUPS,
      'Opening-drive',
    ]);
  });

  it('ignores blanks and duplicates', () => {
    addTaxonomyValue('mistake', '  ');
    addTaxonomyValue('mistake', 'None-followed-plan');
    addTaxonomyValue('mistake', 'Tilted');
    addTaxonomyValue('mistake', 'Tilted');
    expect(taxonomyOptions('mistake', ['None-followed-plan'])).toEqual([
      'None-followed-plan',
      'Tilted',
    ]);
  });

  it('grows a seed-empty Tag list after user Tags', () => {
    addTaxonomyValue('tag', 'FOMC');
    addTaxonomyValue('tag', '  ');
    addTaxonomyValue('tag', 'FOMC');
    expect(taxonomyOptions('tag', [])).toEqual(['FOMC']);
  });

  it('survives reloads and corrupt storage', () => {
    addTaxonomyValue('emotion', 'Brave');
    expect(loadCustomTaxonomy().emotion).toEqual(['Brave']);
    localStorage.setItem('openjournal-taxonomy', 'junk');
    expect(loadCustomTaxonomy()).toEqual({
      setup: [],
      emotion: [],
      mistake: [],
      tag: [],
      playbooks: {},
    });
  });
});

describe('playbooks', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('migrates legacy taxonomy without playbooks to rule-less unarchived', () => {
    localStorage.setItem(
      'openjournal-taxonomy',
      JSON.stringify({ setup: ['Opening-drive'], emotion: [], mistake: [], tag: [] }),
    );
    expect(loadCustomTaxonomy().playbooks).toEqual({});
    expect(getPlaybook('Opening-drive')).toEqual({ rules: [], archived: false });
    expect(playbookOptions(['Breakout', 'Opening-drive'])).toEqual([
      { name: 'Breakout', rules: [], archived: false },
      { name: 'Opening-drive', rules: [], archived: false },
    ]);
  });

  it('stores per-setup rules with taxonomy hygiene and a cap of ten', () => {
    setPlaybookRules('Breakout', [' risk ≤ 1% ', '  ', 'risk ≤ 1%', 'entry on retest']);
    expect(getPlaybook('Breakout').rules).toEqual(['risk ≤ 1%', 'entry on retest']);
    setPlaybookRules(
      'Breakout',
      Array.from({ length: 12 }, (_, i) => `rule ${i + 1}`),
    );
    expect(getPlaybook('Breakout').rules).toHaveLength(10);
  });

  it('archives a setup out of the picker while keeping its history entry', () => {
    setPlaybookArchived('Breakout', true);
    expect(getPlaybook('Breakout').archived).toBe(true);
    expect(activeSetupOptions(['Breakout', 'Pullback'])).toEqual(['Pullback']);
    expect(playbookOptions(['Breakout', 'Pullback']).find((p) => p.name === 'Breakout')).toEqual({
      name: 'Breakout',
      rules: [],
      archived: true,
    });
    setPlaybookArchived('Breakout', false);
    expect(activeSetupOptions(['Breakout', 'Pullback'])).toEqual(['Breakout', 'Pullback']);
  });

  it('reads rule hygiene like taxonomy: blanks and exact-case dupes ignored', () => {
    expect(normalizePlaybookRules([' a ', '', 'a', 'A'])).toEqual(['a', 'A']);
    expect(normalizePlaybookRules('nope')).toEqual([]);
  });
});
