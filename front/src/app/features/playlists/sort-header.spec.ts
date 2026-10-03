import { sortRows } from './sort-header';

describe('sortRows', () => {
  const rows = [{ v: 2 }, { v: null }, { v: 10 }, { v: 1 }];

  it('trie dans les deux sens, les valeurs absentes toujours à la fin', () => {
    expect(sortRows(rows, (r) => r.v, false).map((r) => r.v)).toEqual([1, 2, 10, null]);
    expect(sortRows(rows, (r) => r.v, true).map((r) => r.v)).toEqual([10, 2, 1, null]);
  });

  it('compare les textes à la française', () => {
    const names = [{ v: 'Zen' }, { v: 'été' }, { v: 'Abba' }];
    expect(sortRows(names, (r) => r.v, false).map((r) => r.v)).toEqual(['Abba', 'été', 'Zen']);
  });
});
