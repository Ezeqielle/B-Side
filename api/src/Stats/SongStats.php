<?php

namespace App\Stats;

use App\Entity\Playlist;
use App\Entity\User;
use App\Repository\TrackRepository;
use App\Spotify\SpotifyCatalog;
use Doctrine\DBAL\Connection;
use Doctrine\DBAL\Query\QueryBuilder;

/**
 * Historique d'un morceau (Listening::song()) : ses écoutes depuis toujours, son like et ses playlists.
 */
final readonly class SongStats
{
    private const string PLAYS = 'COUNT(*) FILTER (WHERE ' . Listening::COUNTS . ')';
    private const string LOCAL_TIME = 'p.played_at AT TIME ZONE :tz';
    /** Titre (alias t) de ce morceau. */
    private const string SAME_SONG = '(lower(t.name), lower(t.artist_name)) = (lower(:name), lower(:artist))';

    public function __construct(
        private Connection $connection,
        private Listening $listening,
        private TrackRepository $tracks,
        private SpotifyCatalog $catalog,
    ) {
    }

    /**
     * Morceau d'un titre Spotify. Un titre des tops Spotify peut n'avoir jamais été vu : son nom et son artiste
     * sont alors demandés à Spotify, avec l'artiste de l'album, celui que retient l'historique.
     */
    public function forTrack(User $user, string $trackId, string $tz): SongStat
    {
        $track = $this->tracks->find($trackId);
        if (null !== $track) {
            return $this->song($user, $track->getName(), $track->getArtistName(), $tz);
        }

        $track = $this->catalog->track($user, $trackId);

        return $this->song($user, $track->name, $track->albumArtist, $tz);
    }

    public function song(User $user, string $name, string $artist, string $tz): SongStat
    {
        /** @var array{plays: int, ms_played: int, first_played_at: ?string, last_played_at: ?string} $totals */
        $totals = $this->plays($user, $name, $artist, $tz)
            ->select(
                self::PLAYS . ' AS plays',
                'COALESCE(SUM(p.ms_played), 0) AS ms_played',
                'MIN(p.played_at) FILTER (WHERE ' . Listening::COUNTS . ') AS first_played_at',
                'MAX(p.played_at) FILTER (WHERE ' . Listening::COUNTS . ') AS last_played_at',
            )
            ->fetchAssociative();

        /** @var list<array{month: string, plays: int, ms_played: int}> $months */
        $months = $this->plays($user, $name, $artist, $tz)
            ->select(
                'to_char(' . self::LOCAL_TIME . ", 'YYYY-MM') AS month",
                self::PLAYS . ' AS plays',
                'COALESCE(SUM(p.ms_played), 0) AS ms_played',
            )
            ->groupBy('month')
            ->having(self::PLAYS . ' > 0')
            ->orderBy('month')
            ->fetchAllAssociative();

        $params = ['user' => $user->getId(), 'name' => $name, 'artist' => $artist];

        $likedAt = $this->connection->fetchOne('
            SELECT MIN(pt.added_at)
            FROM playlist pl
            INNER JOIN playlist_track pt ON pt.playlist_id = pl.id
            INNER JOIN track t ON t.id = pt.track_id
            WHERE pl.user_id = :user AND pl.spotify_id = :liked AND ' . self::SAME_SONG, $params + ['liked' => Playlist::LIKED]);

        /** @var list<array{spotify_id: string, name: string, image_url: ?string}> $playlists */
        $playlists = $this->connection->fetchAllAssociative('
            SELECT pl.spotify_id, pl.name, pl.image_url
            FROM playlist pl
            WHERE pl.user_id = :user AND pl.readable AND pl.spotify_id <> :liked AND EXISTS (
                SELECT 1
                FROM playlist_track pt
                INNER JOIN track t ON t.id = pt.track_id
                WHERE pt.playlist_id = pl.id AND ' . self::SAME_SONG . '
            )
            ORDER BY lower(pl.name)', $params + ['liked' => Playlist::LIKED]);

        return new SongStat(
            name: $name,
            artistName: $artist,
            plays: $totals['plays'],
            msPlayed: (int) $totals['ms_played'],
            firstPlayedAt: self::date($totals['first_played_at']),
            lastPlayedAt: self::date($totals['last_played_at']),
            likedAt: self::date(\is_string($likedAt) ? $likedAt : null),
            months: array_map(static fn (array $row): MonthStat => new MonthStat(
                month: $row['month'],
                plays: $row['plays'],
                msPlayed: (int) $row['ms_played'],
            ), $months),
            topWeekday: $this->busiest($user, $name, $artist, $tz, 'ISODOW'),
            topHour: $this->busiest($user, $name, $artist, $tz, 'HOUR'),
            playlists: array_map(static fn (array $row): SongPlaylist => new SongPlaylist(
                id: $row['spotify_id'],
                name: $row['name'],
                imageUrl: $row['image_url'],
            ), $playlists),
        );
    }

    /**
     * Écoutes du morceau (alias p) avec leur titre (alias t).
     */
    private function plays(User $user, string $name, string $artist, string $tz): QueryBuilder
    {
        return $this->listening->plays($user, new PlayFilter(tz: $tz))
            ->andWhere(self::SAME_SONG)
            ->setParameter('name', $name)
            ->setParameter('artist', $artist);
    }

    /**
     * Jour de la semaine (ISODOW) ou heure (HOUR) où le morceau est le plus écouté.
     */
    private function busiest(User $user, string $name, string $artist, string $tz, string $field): ?int
    {
        $value = $this->plays($user, $name, $artist, $tz)
            ->select('EXTRACT(' . $field . ' FROM ' . self::LOCAL_TIME . ') AS slot')
            ->groupBy('slot')
            ->having(self::PLAYS . ' > 0')
            ->orderBy(self::PLAYS, 'DESC')
            ->addOrderBy('slot')
            ->setMaxResults(1)
            ->fetchOne();

        return false === $value ? null : (int) $value;
    }

    private static function date(?string $value): ?\DateTimeImmutable
    {
        return null === $value ? null : new \DateTimeImmutable($value);
    }
}
