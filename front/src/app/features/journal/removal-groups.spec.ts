import { RemovedTrack } from '../../core/models';
import { groupRemovals } from './removal-groups';

function removal(id: number, removedAt: string, playlistId: string, restoredAt: string | null = null): RemovedTrack {
  return {
    id,
    trackId: `t${id}`,
    name: `Song ${id}`,
    artistName: 'Artist',
    albumName: 'Album',
    playlistId,
    playlistName: playlistId,
    position: id,
    addedAt: null,
    removedAt,
    restoredAt,
  };
}

describe('groupRemovals', () => {
  it('groups tracks removed together from the same playlist, newest first', () => {
    const groups = groupRemovals([
      removal(3, '2026-10-03T15:00:00+00:00', 'liked'),
      removal(4, '2026-10-03T15:00:00+00:00', 'liked', '2026-10-03T16:00:00+00:00'),
      removal(1, '2026-10-01T10:00:00+00:00', 'mix'),
      removal(2, '2026-10-01T10:00:00+00:00', 'liked'),
    ]);

    expect(groups.map((g) => [g.playlistId, g.tracks.map((t) => t.id), g.pending.map((t) => t.id)])).toEqual([
      ['liked', [3, 4], [3]],
      ['mix', [1], [1]],
      ['liked', [2], [2]],
    ]);
  });
});
