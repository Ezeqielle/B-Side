<?php

namespace App\Playlist;

use App\Entity\Playlist;
use App\Entity\User;
use App\Stats\Listening;
use App\Stats\PlayFilter;
use Doctrine\DBAL\Connection;

/**
 * Statistiques des playlists, croisées avec les écoutes d'un PlayFilter. Titres de playlist et écoutes
 * sont rapprochés par morceau (Listening::song()).
 *
 * Les titres likés (Playlist::LIKED) comptent comme une playlist, sauf dans le nombre de playlists et pour
 * les doublons : sinon, chaque titre liké rangé dans une playlist serait un doublon.
 */
final readonly class PlaylistStats
{
    /** Playlist (alias pl) qui n'est pas les titres likés. */
    private const string NOT_LIKED = "pl.spotify_id <> '" . Playlist::LIKED . "'";

    /** Titre jamais écouté (alias l pour ses écoutes). */
    private const string NEVER_PLAYED = 'COALESCE(l.plays, 0) = 0';

    public function __construct(
        private Connection $connection,
        private Listening $listening,
    ) {
    }

    public function overview(User $user, PlayFilter $filter): PlaylistOverview
    {
        /** @var array{readable: int, unreadable: int} $playlists */
        $playlists = $this->connection->fetchAssociative('
            SELECT COUNT(*) FILTER (WHERE readable) AS readable, COUNT(*) FILTER (WHERE NOT readable) AS unreadable
            FROM playlist pl
            WHERE user_id = :user AND ' . self::NOT_LIKED, ['user' => $user->getId()]);

        /** @var array{tracks: int, never_played: int, duplicates: int} $songs */
        $songs = $this->withListened($user, $filter, '
            , songs (name, artist, copies) AS (
                SELECT ' . Listening::song('t') . ', COUNT(*) FILTER (WHERE ' . self::NOT_LIKED . ') AS copies
                FROM playlist pl
                INNER JOIN playlist_track pt ON pt.playlist_id = pl.id
                INNER JOIN track t ON t.id = pt.track_id
                WHERE pl.user_id = :user AND pl.readable
                GROUP BY 1, 2
            )
            SELECT COUNT(*) AS tracks,
                COUNT(*) FILTER (WHERE ' . self::NEVER_PLAYED . ') AS never_played,
                COUNT(*) FILTER (WHERE s.copies > 1) AS duplicates
            FROM songs s
            LEFT JOIN listened l ON (l.name, l.artist) = (s.name, s.artist)
            ')[0];

        return new PlaylistOverview(
            syncedAt: $user->getPlaylistsSyncedAt(),
            playlists: $playlists['readable'],
            unreadable: $playlists['unreadable'],
            tracks: $songs['tracks'],
            neverPlayed: $songs['never_played'],
            duplicates: $songs['duplicates'],
        );
    }

    /**
     * Playlists dont on connaît le contenu, par nom.
     *
     * @return list<PlaylistStat>
     */
    public function playlists(User $user, PlayFilter $filter): array
    {
        return $this->findPlaylists($user, $filter);
    }

    /**
     * @param string $id id Spotify, ou Playlist::LIKED
     */
    public function playlist(User $user, string $id, PlayFilter $filter): ?PlaylistStat
    {
        return $this->findPlaylists($user, $filter, $id)[0] ?? null;
    }

    /**
     * Titres de la playlist, dans l'ordre.
     *
     * @return list<PlaylistTrackStat>
     */
    public function tracks(Playlist $playlist, PlayFilter $filter): array
    {
        /** @var list<array{position: int, id: string, name: string, artist_name: string, album_name: string, duration_ms: ?int, image_url: ?string, album_type: ?string, album_tracks: ?int, added_at: ?string, plays: int, starts: int, skip_rate: float, last_played_at: ?string}> $rows */
        $rows = $this->withListened($playlist->getUser(), $filter, '
            SELECT pt.position, t.id, t.name, t.artist_name, t.album_name, t.duration_ms, t.image_url, t.album_type, t.album_tracks,
                pt.added_at,
                COALESCE(l.plays, 0) AS plays,
                COALESCE(l.starts, 0) AS starts,
                COALESCE(l.skips::float / NULLIF(l.starts, 0), 0) AS skip_rate,
                l.last_played_at
            FROM playlist_track pt
            INNER JOIN track t ON t.id = pt.track_id
            LEFT JOIN listened l ON (l.name, l.artist) = (' . Listening::song('t') . ')
            WHERE pt.playlist_id = :playlist
            ORDER BY pt.position
            ', ['playlist' => $playlist->getId()]);

        return array_map(static fn (array $row): PlaylistTrackStat => new PlaylistTrackStat(
            position: $row['position'],
            id: $row['id'],
            name: $row['name'],
            artistName: $row['artist_name'],
            albumName: $row['album_name'],
            durationMs: $row['duration_ms'],
            imageUrl: $row['image_url'],
            albumType: $row['album_type'],
            albumTracks: $row['album_tracks'],
            addedAt: self::date($row['added_at']),
            plays: $row['plays'],
            starts: $row['starts'],
            skipRate: (float) $row['skip_rate'],
            lastPlayedAt: self::date($row['last_played_at']),
        ), $rows);
    }

    /**
     * Versions d'un même morceau dans la playlist (SongVersions), avec leurs écoutes.
     *
     * @return list<list<SongVersion>>
     */
    public function versions(Playlist $playlist): array
    {
        return SongVersions::group($this->tracks($playlist, new PlayFilter()));
    }

    /**
     * Titres en double, les plus répétés d'abord.
     *
     * @return list<DuplicateTrack>
     */
    public function duplicates(User $user, int $limit): array
    {
        /** @var list<array{id: string, name: string, artist_name: string, image_url: ?string, playlists: string}> $rows */
        $rows = $this->connection->fetchAllAssociative('
            SELECT MIN(t.id) AS id, MIN(t.name) AS name, MIN(t.artist_name) AS artist_name,
                (array_agg(t.image_url ORDER BY t.id))[1] AS image_url,
                array_to_json(array_agg(pl.name ORDER BY lower(pl.name))) AS playlists
            FROM playlist pl
            INNER JOIN playlist_track pt ON pt.playlist_id = pl.id
            INNER JOIN track t ON t.id = pt.track_id
            WHERE pl.user_id = :user AND pl.readable AND ' . self::NOT_LIKED . '
            GROUP BY ' . Listening::song('t') . '
            HAVING COUNT(*) > 1
            ORDER BY COUNT(*) DESC, lower(MIN(t.name))
            LIMIT :limit
            ', ['user' => $user->getId(), 'limit' => $limit]);

        return array_map(static fn (array $row): DuplicateTrack => new DuplicateTrack(
            id: $row['id'],
            name: $row['name'],
            artistName: $row['artist_name'],
            imageUrl: $row['image_url'],
            playlists: json_decode($row['playlists'], true, flags: \JSON_THROW_ON_ERROR),
        ), $rows);
    }

    /**
     * @return list<PlaylistStat>
     */
    private function findPlaylists(User $user, PlayFilter $filter, ?string $id = null): array
    {
        /** @var list<array{id: string, name: string, owner_name: string, image_url: ?string, tracks: int, artists: int, duration_ms: int, never_played: int, skip_rate: float, last_played_at: ?string, last_added_at: ?string}> $rows */
        $rows = $this->withListened($user, $filter, '
            SELECT pl.spotify_id AS id, pl.name, pl.owner_name, pl.image_url,
                COUNT(t.id) AS tracks,
                COUNT(DISTINCT lower(t.artist_name)) AS artists,
                COALESCE(SUM(t.duration_ms), 0) AS duration_ms,
                COUNT(t.id) FILTER (WHERE ' . self::NEVER_PLAYED . ') AS never_played,
                COALESCE(SUM(l.skips)::float / NULLIF(SUM(l.starts), 0), 0) AS skip_rate,
                MAX(l.last_played_at) AS last_played_at,
                MAX(pt.added_at) AS last_added_at
            FROM playlist pl
            LEFT JOIN playlist_track pt ON pt.playlist_id = pl.id
            LEFT JOIN track t ON t.id = pt.track_id
            LEFT JOIN listened l ON (l.name, l.artist) = (' . Listening::song('t') . ')
            WHERE pl.user_id = :user AND pl.readable' . (null === $id ? '' : ' AND pl.spotify_id = :id') . '
            GROUP BY pl.id
            ORDER BY lower(pl.name), pl.id
            ', null === $id ? [] : ['id' => $id]);

        return array_map(static fn (array $row): PlaylistStat => new PlaylistStat(
            id: $row['id'],
            name: $row['name'],
            ownerName: $row['owner_name'],
            imageUrl: $row['image_url'],
            tracks: $row['tracks'],
            artists: $row['artists'],
            durationMs: (int) $row['duration_ms'],
            neverPlayed: $row['never_played'],
            skipRate: (float) $row['skip_rate'],
            lastPlayedAt: self::date($row['last_played_at']),
            lastAddedAt: self::date($row['last_added_at']),
        ), $rows);
    }

    /**
     * Exécute `$sql` précédé de la table `listened` : écoutes du filtre par morceau (Listening::bySong()).
     *
     * @param array<string, mixed> $params
     *
     * @return list<array<string, mixed>>
     */
    private function withListened(User $user, PlayFilter $filter, string $sql, array $params = []): array
    {
        $listened = $this->listening->bySong($user, $filter);

        return $this->connection->fetchAllAssociative(
            'WITH listened AS (' . $listened->getSQL() . ')' . $sql,
            [...$listened->getParameters(), ...$params],
        );
    }

    private static function date(?string $value): ?\DateTimeImmutable
    {
        return null !== $value ? new \DateTimeImmutable($value) : null;
    }
}
