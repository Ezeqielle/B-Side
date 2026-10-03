<?php

namespace App\Stats;

use App\Entity\User;
use Doctrine\DBAL\Query\QueryBuilder;

/**
 * Statistiques sur les écoutes importées d'un utilisateur, restreintes par un PlayFilter.
 */
final readonly class PlayStats
{
    private const string PLAYS = 'COUNT(*) FILTER (WHERE ' . Listening::COUNTS . ')';
    private const string MS_PLAYED = 'COALESCE(SUM(p.ms_played), 0)';
    private const string SKIP_RATE = 'COALESCE(AVG(p.skipped::int), 0)';
    private const string LOCAL_TIME = 'p.played_at AT TIME ZONE :tz';

    public function __construct(private Listening $listening)
    {
    }

    public function overview(User $user, PlayFilter $filter): Overview
    {
        /** @var array{plays: int, ms_played: int, tracks: int, artists: int, skip_rate: string} $row */
        $row = $this->listening->plays($user, $filter)
            ->select(
                self::PLAYS . ' AS plays',
                self::MS_PLAYED . ' AS ms_played',
                'COUNT(DISTINCT p.track_id) AS tracks',
                'COUNT(DISTINCT t.artist_name) AS artists',
                self::SKIP_RATE . ' AS skip_rate',
            )
            ->fetchAssociative();

        return new Overview(
            plays: $row['plays'],
            msPlayed: (int) $row['ms_played'],
            tracks: $row['tracks'],
            artists: $row['artists'],
            skipRate: (float) $row['skip_rate'],
        );
    }

    /**
     * @return list<TrackStat>
     */
    public function topTracks(User $user, PlayFilter $filter, int $limit): array
    {
        return $this->rankTracks($this->listening->plays($user, $filter), $limit);
    }

    /**
     * Titres les plus écoutés qui ne sont dans aucune playlist lisible de l'utilisateur (titres likés compris).
     *
     * @return list<TrackStat>
     */
    public function topTracksOutsidePlaylists(User $user, PlayFilter $filter, int $limit): array
    {
        $query = $this->listening->plays($user, $filter)->andWhere('
            NOT EXISTS (
                SELECT 1
                FROM playlist pl
                INNER JOIN playlist_track pt ON pt.playlist_id = pl.id
                INNER JOIN track pt_t ON pt_t.id = pt.track_id
                WHERE pl.user_id = p.user_id AND pl.readable AND ' . Listening::sameSong('pt_t', 't') . '
            )
            ');

        return $this->rankTracks($query, $limit);
    }

    /**
     * @return list<ArtistStat>
     */
    public function topArtists(User $user, PlayFilter $filter, int $limit): array
    {
        /** @var list<array{artist_name: string, plays: int, ms_played: int, tracks: int}> $rows */
        $rows = $this->listening->plays($user, $filter)
            ->select(
                't.artist_name',
                self::PLAYS . ' AS plays',
                self::MS_PLAYED . ' AS ms_played',
                'COUNT(DISTINCT p.track_id) AS tracks',
            )
            ->groupBy('t.artist_name')
            ->having(self::PLAYS . ' > 0')
            ->orderBy('plays', 'DESC')
            ->addOrderBy('ms_played', 'DESC')
            ->setMaxResults($limit)
            ->fetchAllAssociative();

        return array_map(static fn (array $row): ArtistStat => new ArtistStat(
            name: $row['artist_name'],
            plays: $row['plays'],
            msPlayed: (int) $row['ms_played'],
            tracks: $row['tracks'],
        ), $rows);
    }

    /**
     * Écoutes par mois, sans les mois vides.
     *
     * @return list<MonthStat>
     */
    public function timeline(User $user, PlayFilter $filter): array
    {
        /** @var list<array{month: string, plays: int, ms_played: int}> $rows */
        $rows = $this->listening->plays($user, $filter)
            ->select(
                'to_char(' . self::LOCAL_TIME . ", 'YYYY-MM') AS month",
                self::PLAYS . ' AS plays',
                self::MS_PLAYED . ' AS ms_played',
            )
            ->groupBy('month')
            ->orderBy('month')
            ->fetchAllAssociative();

        return array_map(static fn (array $row): MonthStat => new MonthStat(
            month: $row['month'],
            plays: $row['plays'],
            msPlayed: (int) $row['ms_played'],
        ), $rows);
    }

    /**
     * Écoutes par jour de la semaine et par heure, sans les créneaux vides.
     *
     * @return list<HourStat>
     */
    public function clock(User $user, PlayFilter $filter): array
    {
        /** @var list<array{weekday: string, hour: string, plays: int}> $rows */
        $rows = $this->listening->plays($user, $filter)
            ->select(
                'EXTRACT(ISODOW FROM ' . self::LOCAL_TIME . ') AS weekday',
                'EXTRACT(HOUR FROM ' . self::LOCAL_TIME . ') AS hour',
                self::PLAYS . ' AS plays',
            )
            ->groupBy('weekday', 'hour')
            ->fetchAllAssociative();

        return array_map(static fn (array $row): HourStat => new HourStat(
            weekday: (int) $row['weekday'],
            hour: (int) $row['hour'],
            plays: $row['plays'],
        ), $rows);
    }

    /**
     * Classe les titres de ces écoutes.
     *
     * @return list<TrackStat>
     */
    private function rankTracks(QueryBuilder $plays, int $limit): array
    {
        /** @var list<array{id: string, name: string, artist_name: string, album_name: string, plays: int, ms_played: int, skip_rate: string, last_played_at: string}> $rows */
        $rows = $plays
            ->select(
                't.id',
                't.name',
                't.artist_name',
                't.album_name',
                self::PLAYS . ' AS plays',
                self::MS_PLAYED . ' AS ms_played',
                self::SKIP_RATE . ' AS skip_rate',
                'MAX(p.played_at) AS last_played_at',
            )
            ->groupBy('t.id')
            ->having(self::PLAYS . ' > 0')
            ->orderBy('plays', 'DESC')
            ->addOrderBy('ms_played', 'DESC')
            ->setMaxResults($limit)
            ->fetchAllAssociative();

        return array_map(static fn (array $row): TrackStat => new TrackStat(
            id: $row['id'],
            name: $row['name'],
            artistName: $row['artist_name'],
            albumName: $row['album_name'],
            plays: $row['plays'],
            msPlayed: (int) $row['ms_played'],
            skipRate: (float) $row['skip_rate'],
            lastPlayedAt: new \DateTimeImmutable($row['last_played_at']),
        ), $rows);
    }
}
