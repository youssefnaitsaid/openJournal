import { beforeEach, describe, expect, it } from 'vitest';
import { SETUPS } from '../trades/trade';
import {
  addTaxonomyValue,
  loadCustomTaxonomy,
  taxonomyOptions,
} from './taxonomy';

describe('taxonomy', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('offers seed values with nothing custom stored', () => {
    expect(taxonomyOptions('setup', SETUPS)).toEqual([...SETUPS]);
    expect(loadCustomTaxonomy()).toEqual({
      setup: [],
      emotion: [],
      mistake: [],
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

  it('survives reloads and corrupt storage', () => {
    addTaxonomyValue('emotion', 'Brave');
    expect(loadCustomTaxonomy().emotion).toEqual(['Brave']);
    localStorage.setItem('openjournal-taxonomy', 'junk');
    expect(loadCustomTaxonomy()).toEqual({
      setup: [],
      emotion: [],
      mistake: [],
    });
  });
});
