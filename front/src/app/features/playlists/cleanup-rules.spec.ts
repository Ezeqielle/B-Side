import { PlaylistTrackStat } from '../../core/models';
import { CleanupRules, matchesRules, months, paramsOf, rulesOf, sameRules } from './cleanup-rules';

const REFERENCE = Date.parse('2026-09-01T00:00:00Z');

function track(changes: Partial<PlaylistTrackStat>): PlaylistTrackStat {
  return {
    position: 0,
    id: 'id',
    name: 'Song',
    artistName: 'Artist',
    albumName: 'Album',
    imageUrl: null,
    albumType: null,
    albumTracks: null,
    durationMs: 200_000,
    addedAt: '2020-01-01T00:00:00Z',
    plays: 10,
    starts: 10,
    skipRate: 0,
    lastPlayedAt: '2026-08-01T00:00:00Z',
    ...changes,
  };
}

const NONE: CleanupRules = { addedMonths: 6, never: false, idleMonths: null, skipRate: null, minStarts: 3 };

describe('matchesRules', () => {
  it('selects never played tracks', () => {
    const rules = { ...NONE, never: true };
    expect(matchesRules(track({ plays: 0, lastPlayedAt: null }), rules, REFERENCE)).toBe(true);
    expect(matchesRules(track({}), rules, REFERENCE)).toBe(false);
  });

  it('selects tracks not played for a while, counted up to the last imported play', () => {
    const rules = { ...NONE, idleMonths: 24 };
    expect(matchesRules(track({ lastPlayedAt: '2024-06-01T00:00:00Z' }), rules, REFERENCE)).toBe(true);
    expect(matchesRules(track({ lastPlayedAt: '2025-06-01T00:00:00Z' }), rules, REFERENCE)).toBe(false);
    expect(matchesRules(track({ plays: 0, lastPlayedAt: null }), rules, REFERENCE)).toBe(false);
  });

  it('selects often skipped tracks, once started enough times', () => {
    const rules = { ...NONE, skipRate: 0.6, minStarts: 3 };
    expect(matchesRules(track({ starts: 5, skipRate: 0.8 }), rules, REFERENCE)).toBe(true);
    expect(matchesRules(track({ starts: 2, skipRate: 1 }), rules, REFERENCE)).toBe(false);
    expect(matchesRules(track({ starts: 5, skipRate: 0.4 }), rules, REFERENCE)).toBe(false);
  });

  it('protects recently added tracks, unless their date is unknown', () => {
    const rules = { ...NONE, never: true };
    const neverPlayed = { plays: 0, lastPlayedAt: null };
    expect(matchesRules(track({ ...neverPlayed, addedAt: '2026-05-01T00:00:00Z' }), rules, REFERENCE)).toBe(false);
    expect(matchesRules(track({ ...neverPlayed, addedAt: null }), rules, REFERENCE)).toBe(true);
    expect(
      matchesRules(track({ ...neverPlayed, addedAt: '2026-05-01T00:00:00Z' }), { ...rules, addedMonths: 0 }, REFERENCE),
    ).toBe(true);
  });
});

describe('cleanup params', () => {
  it('round-trips through the URL', () => {
    const rules: CleanupRules = { addedMonths: 6, never: true, idleMonths: 24, skipRate: 0.6, minStarts: 3 };
    expect(paramsOf(rules)).toEqual({ added: '6', never: '1', idle: '24', skip: '60', starts: '3' });
    expect(rulesOf(paramsOf(rules))).toEqual(rules);
    expect(rulesOf(paramsOf(NONE))).toEqual(NONE);
  });

  it('is not cleaning without rules, and ignores invalid values', () => {
    expect(rulesOf({})).toBeNull();
    expect(rulesOf({ added: 'x', idle: '-3', skip: '250' })).toEqual({
      addedMonths: 0,
      never: false,
      idleMonths: null,
      skipRate: 1,
      minStarts: 3,
    });
  });
});

describe('sameRules', () => {
  it('ignores the minimum of starts when skips are not a criterion', () => {
    expect(sameRules(NONE, { ...NONE, minStarts: 8 })).toBe(true);
    expect(sameRules({ ...NONE, skipRate: 0.6 }, { ...NONE, skipRate: 0.6, minStarts: 8 })).toBe(false);
  });
});

describe('months', () => {
  it('speaks in years when it can', () => {
    expect([months(6), months(12), months(18), months(24)]).toEqual(['6 mois', '1 an', '18 mois', '2 ans']);
  });
});
