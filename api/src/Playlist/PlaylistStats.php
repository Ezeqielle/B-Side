<?php

namespace App\Playlist;

use App\Entity\Playlist;
use App\Entity\User;
use Doctrine\DBAL\Connection;

/**
 * Statistiques des playlists, croisées avec l'historique d'écoute.
 *
 * Un même morceau a souvent plusieurs ids Spotify (single, album, compilation) : un titre de playlist
 * et une écoute sont rapprochés par leur nom et leur artiste, sans tenir compte de la casse.
 */
final readonly class PlaylistStats
{
    /**
     * Écoutes de l'utilisateur par morceau (name, artist en minuscules). Comme dans les stats d'écoute,
     * une écoute ne compte qu'au-delà de 30 secondes, et le taux de titres passés prend tout en compte.
     */
    private const string LISTENED = <<<'SQL'
        listened AS (
            SELECT lower(t.name) AS name, lower(t.artist_name) AS artist,
                COUNT(*) FILTER (WHERE p.ms_played >= 30000) AS plays,
                COUNT(*) AS starts,
                SUM(p.skipped::int) AS skips,
                MAX(p.played_at) FILTER (WHERE p.ms_played >= 30000) AS last_played_at
            FROM play p
            INNER JOIN track t ON t.id = p.track_id
            WHERE p.user_id = :user
            GROUP BY 1, 2
        )
        SQL;

    private const string JOIN_LISTENED = 'LEFT JOIN listened l ON l.name = lower(t.name) AND l.artist = lower(t.artist_name)';

    public function __construct(private Connection $connection)
    {
    }

    public function overview(User $user): PlaylistOverview
    {
        /** @var array{readable: int, unreadable: int} $playlists */
        $playlists = $this->connection->fetchAssociative(<<<'SQL'
            SELECT COUNT(*) FILTER (WHERE readable) AS readable, COUNT(*) FILTER (WHERE NOT readable) AS unreadable
            FROM playlist
            WHERE user_id = :user
            SQL, ['user' => $user->getId()]);

        /** @var array{tracks: int, never_played: int, duplicates: int} $songs */
        $songs = $this->connection->fetchAssociative('WITH ' . self::LISTENED . <<<'SQL'
            , songs AS (
                SELECT lower(t.name) AS name, lower(t.artist_name) AS artist, COUNT(*) AS copies
                FROM playlist pl
                INNER JOIN playlist_track pt ON pt.playlist_id = pl.id
                INNER JOIN track t ON t.id = pt.track_id
                WHERE pl.user_id = :user AND pl.readable
                GROUP BY 1, 2
            )
            SELECT COUNT(*) AS tracks,
                COUNT(*) FILTER (WHERE COALESCE(l.plays, 0) = 0) AS never_played,
                COUNT(*) FILTER (WHERE s.copies > 1) AS duplicates
            FROM songs s
            LEFT JOIN listened l ON l.name = s.name AND l.artist = s.artist
            SQL, ['user' => $user->getId()]);

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
    public function playlists(User $user): array
    {
        /** @var list<array{id: string, name: string, owner_name: string, image_url: ?string, tracks: int, artists: int, duration_ms: int, never_played: int, skip_rate: float, last_played_at: ?string, last_added_at: ?string}> $rows */
        $rows = $this->connection->fetchAllAssociative('WITH ' . self::LISTENED . '
            SELECT pl.spotify_id AS id, pl.name, pl.owner_name, pl.image_url,
                COUNT(t.id) AS tracks,
                COUNT(DISTINCT lower(t.artist_name)) AS artists,
                COALESCE(SUM(t.duration_ms), 0) AS duration_ms,
                COUNT(t.id) FILTER (WHERE COALESCE(l.plays, 0) = 0) AS never_played,
                COALESCE(SUM(l.skips)::float / NULLIF(SUM(l.starts), 0), 0) AS skip_rate,
                MAX(l.last_played_at) AS last_played_at,
                MAX(pt.added_at) AS last_added_at
            FROM playlist pl
            LEFT JOIN playlist_track pt ON pt.playlist_id = pl.id
            LEFT JOIN track t ON t.id = pt.track_id
            ' . self::JOIN_LISTENED . '
            WHERE pl.user_id = :user AND pl.readable
            GROUP BY pl.id
            ORDER BY lower(pl.name), pl.id
            ', ['user' => $user->getId()]);

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
     * Titres de la playlist, dans l'ordre.
     *
     * @return list<PlaylistTrackStat>
     */
    public function tracks(Playlist $playlist): array
    {
        /** @var list<array{position: int, id: string, name: string, artist_name: string, album_name: string, duration_ms: ?int, added_at: ?string, plays: int, skip_rate: float, last_played_at: ?string}> $rows */
        $rows = $this->connection->fetchAllAssociative('WITH ' . self::LISTENED . '
            SELECT pt.position, t.id, t.name, t.artist_name, t.album_name, t.duration_ms, pt.added_at,
                COALESCE(l.plays, 0) AS plays,
                COALESCE(l.skips::float / NULLIF(l.starts, 0), 0) AS skip_rate,
                l.last_played_at
            FROM playlist_track pt
            INNER JOIN track t ON t.id = pt.track_id
            ' . self::JOIN_LISTENED . '
            WHERE pt.playlist_id = :playlist
            ORDER BY pt.position
            ', ['user' => $playlist->getUser()->getId(), 'playlist' => $playlist->getId()]);

        return array_map(static fn (array $row): PlaylistTrackStat => new PlaylistTrackStat(
            position: $row['position'],
            id: $row['id'],
            name: $row['name'],
            artistName: $row['artist_name'],
            albumName: $row['album_name'],
            durationMs: $row['duration_ms'],
            addedAt: self::date($row['added_at']),
            plays: $row['plays'],
            skipRate: (float) $row['skip_rate'],
            lastPlayedAt: self::date($row['last_played_at']),
        ), $rows);
    }

    /**
     * Titres en double, les plus répétés d'abord.
     *
     * @return list<DuplicateTrack>
     */
    public function duplicates(User $user, int $limit): array
    {
        /** @var list<array{id: string, name: string, artist_name: string, playlists: string}> $rows */
        $rows = $this->connection->fetchAllAssociative(<<<'SQL'
            SELECT MIN(t.id) AS id, MIN(t.name) AS name, MIN(t.artist_name) AS artist_name,
                array_to_json(array_agg(pl.name ORDER BY lower(pl.name))) AS playlists
            FROM playlist pl
            INNER JOIN playlist_track pt ON pt.playlist_id = pl.id
            INNER JOIN track t ON t.id = pt.track_id
            WHERE pl.user_id = :user AND pl.readable
            GROUP BY lower(t.name), lower(t.artist_name)
            HAVING COUNT(*) > 1
            ORDER BY COUNT(*) DESC, lower(MIN(t.name))
            LIMIT :limit
            SQL, ['user' => $user->getId(), 'limit' => $limit]);

        return array_map(static fn (array $row): DuplicateTrack => new DuplicateTrack(
            id: $row['id'],
            name: $row['name'],
            artistName: $row['artist_name'],
            playlists: json_decode($row['playlists'], true, flags: \JSON_THROW_ON_ERROR),
        ), $rows);
    }

    private static function date(?string $value): ?\DateTimeImmutable
    {
        return null !== $value ? new \DateTimeImmutable($value) : null;
    }
}
