<?php

namespace App\Stats;

use App\Entity\User;
use Doctrine\DBAL\Connection;
use Doctrine\DBAL\Query\QueryBuilder;

/**
 * Règles communes aux stats d'écoute et de playlists : ce qui compte comme écoute, ce qui est un même morceau,
 * et la sélection des écoutes d'un PlayFilter.
 */
final readonly class Listening
{
    /** Comme Spotify, une écoute ne compte qu'au-delà de 30 secondes (alias p). */
    public const string COUNTS = 'p.ms_played >= 30000';

    public function __construct(private Connection $connection)
    {
    }

    /**
     * Un même morceau a souvent plusieurs ids Spotify (single, album, compilation) : il est reconnu
     * à son nom et à son artiste, sans tenir compte de la casse. Colonnes `name` et `artist` du titre `$track`.
     */
    public static function song(string $track): string
    {
        return \sprintf('lower(%1$s.name), lower(%1$s.artist_name)', $track);
    }

    /**
     * Condition « même morceau » entre deux titres.
     */
    public static function sameSong(string $track, string $other): string
    {
        return \sprintf('(%s) = (%s)', self::song($track), self::song($other));
    }

    /**
     * Écoutes de l'utilisateur (alias p) avec leur titre (alias t), restreintes par le filtre.
     */
    public function plays(User $user, PlayFilter $filter): QueryBuilder
    {
        $query = $this->connection->createQueryBuilder()
            ->from('play', 'p')
            ->innerJoin('p', 'track', 't', 't.id = p.track_id')
            ->where('p.user_id = :user')
            ->setParameter('user', $user->getId())
            ->setParameter('tz', $filter->tz);

        if (null !== $filter->from) {
            $query->andWhere('p.played_at >= CAST(:from AS timestamp) AT TIME ZONE :tz')
                ->setParameter('from', $filter->from->format('Y-m-d'));
        }

        if (null !== $filter->to) {
            $query->andWhere("p.played_at < (CAST(:to AS timestamp) + INTERVAL '1 day') AT TIME ZONE :tz")
                ->setParameter('to', $filter->to->format('Y-m-d'));
        }

        if (null !== $filter->artist) {
            $query->andWhere('t.artist_name = :artist')
                ->setParameter('artist', $filter->artist);
        }

        return $query;
    }

    /**
     * Écoutes par morceau : `name` et `artist` en minuscules, `plays` (écoutes qui comptent), `starts` (toutes),
     * `skips` et `last_played_at`. À rejoindre avec Listening::song().
     */
    public function bySong(User $user, PlayFilter $filter): QueryBuilder
    {
        return $this->plays($user, $filter)
            ->select(
                'lower(t.name) AS name',
                'lower(t.artist_name) AS artist',
                'COUNT(*) FILTER (WHERE ' . self::COUNTS . ') AS plays',
                'COUNT(*) AS starts',
                'SUM(p.skipped::int) AS skips',
                'MAX(p.played_at) FILTER (WHERE ' . self::COUNTS . ') AS last_played_at',
            )
            ->groupBy('1', '2');
    }
}
