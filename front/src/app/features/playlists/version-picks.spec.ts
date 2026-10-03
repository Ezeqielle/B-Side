import { PlaylistTrackStat, SongVersion } from '../../core/models';
import { defaultKept, minutes, removedByDefault } from './version-picks';

function version(position: number, recording: number, addedAt: string | null): SongVersion {
  const track: PlaylistTrackStat = {
    position,
    id: `id${position}`,
    name: 'Song',
    artistName: 'Artist',
    albumName: 'Album',
    imageUrl: null,
    durationMs: 200_000,
    addedAt,
    plays: 0,
    starts: 0,
    skipRate: 0,
    lastPlayedAt: null,
  };
  return { track, recording };
}

describe('defaultKept', () => {
  it('keeps the version added first', () => {
    expect(defaultKept([version(0, 0, '2024-01-01T00:00:00Z'), version(5, 0, '2020-01-01T00:00:00Z')])).toBe(5);
    expect(defaultKept([version(0, 0, '2024-01-01T00:00:00Z'), version(5, 0, null)])).toBe(5);
    expect(defaultKept([version(0, 0, null), version(5, 0, null)])).toBe(0);
  });
});

describe('removedByDefault', () => {
  const kept = version(0, 0, null);
  const sameRecording = version(3, 0, null);
  const remix = version(7, 7, null);

  it('only checks the same recording, unless other versions are included', () => {
    expect([kept, sameRecording, remix].map((v) => removedByDefault(v, kept, false))).toEqual([false, true, false]);
    expect([kept, sameRecording, remix].map((v) => removedByDefault(v, kept, true))).toEqual([false, true, true]);
  });
});

describe('minutes', () => {
  it('formats a duration', () => {
    expect([minutes(214_546), minutes(60_000), minutes(null)]).toEqual(['3:35', '1:00', '—']);
  });
});
