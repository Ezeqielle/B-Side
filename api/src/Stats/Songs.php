<?php

namespace App\Stats;

use App\Entity\Playlist;
use App\Entity\User;
use Doctrine\DBAL\Connection;
use Doctrine\DBAL\Query\QueryBuilder;

/**
 * Le morceau, commun aux stats d'écoute et de playlists. Un même morceau a souvent plusieurs ids Spotify (single,
 * album, compilation) : il est reconnu à son nom et à son artiste, sans la casse. Comme Spotify, une écoute ne compte
 * qu'au-delà de 30 secondes.
 *
 * Les requêtes rejoignent les ensembles de with() par la clé d'un titre (key()).
 */
final readonly class Songs
{
    /** Écoute qui compte (alias p). */
    private const string COUNTS = 'p.ms_played >= 30000';

    /** Nombre d'écoutes qui comptent, parmi celles de plays(). */
    public const string PLAYS = 'COUNT(*) FILTER (WHERE ' . self::COUNTS . ')';

    /** Morceaux des playlists lisibles de :user : `copies` hors likes, `liked`. */
    private const string PLAYLIST_SONGS = "
        SELECT lower(pl_t.name) AS name, lower(pl_t.artist_name) AS artist,
            COUNT(*) FILTER (WHERE pl.spotify_id <> '" . Playlist::LIKED . "') AS copies,
            bool_or(pl.spotify_id = '" . Playlist::LIKED . "') AS liked
        FROM playlist pl
        INNER JOIN playlist_track pt ON pt.playlist_id = pl.id
        INNER JOIN track pl_t ON pl_t.id = pt.track_id
        WHERE pl.user_id = :user AND pl.readable
        GROUP BY 1, 2";

    public function __construct(private Connection $connection)
    {
    }

    /**
     * Clé du morceau du titre `$track`, à comparer à `(name, artist)` des ensembles de with().
     */
    public static function key(string $track): string
    {
        return \sprintf('lower(%1$s.name), lower(%1$s.artist_name)', $track);
    }

    /**
     * Clé du morceau du titre `$track`, en colonnes `name` et `artist` : pour regrouper par morceau.
     */
    public static function keyColumns(string $track): string
    {
        return \sprintf('lower(%1$s.name) AS name, lower(%1$s.artist_name) AS artist', $track);
    }

    /**
     * Condition : le titre `$track` est le morceau des paramètres `:name` et `:artist`.
     */
    public static function isSong(string $track): string
    {
        return '(' . self::key($track) . ') = (lower(:name), lower(:artist))';
    }

    /**
     * Condition : le morceau du titre `$track` est rangé dans une playlist lisible de `:user`, likes compris.
     */
    public static function inPlaylists(string $track): string
    {
        return '(' . self::key($track) . ') IN (SELECT name, artist FROM (' . self::PLAYLIST_SONGS . ') playlist_songs)';
    }

    /**
     * Agrégat des seules écoutes qui comptent, par exemple `counted('MAX(p.played_at)')`.
     */
    public static function counted(string $aggregate): string
    {
        return $aggregate . ' FILTER (WHERE ' . self::COUNTS . ')';
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
            $query->andWhere('lower(t.artist_name) = lower(:artist)')
                ->setParameter('artist', $filter->artist);
        }

        return $query;
    }

    /**
     * Exécute `$sql` précédé de deux ensembles, par morceau (`name`, `artist`) :
     * - `listened`, les écoutes du filtre : `plays` (celles qui comptent), `starts` (toutes), `skips`, `last_played_at` ;
     * - `playlist_songs`, les morceaux des playlists lisibles : `copies` hors likes, `liked`.
     *
     * `$sql` peut commencer par d'autres ensembles (`, autre AS (…)`). Le paramètre `:user` est fourni.
     *
     * @param array<string, mixed> $params
     *
     * @return list<array<string, mixed>>
     */
    public function with(User $user, PlayFilter $filter, string $sql, array $params = []): array
    {
        $listened = $this->plays($user, $filter)
            ->select(
                self::keyColumns('t'),
                self::PLAYS . ' AS plays',
                'COUNT(*) AS starts',
                'SUM(p.skipped::int) AS skips',
                self::counted('MAX(p.played_at)') . ' AS last_played_at',
            )
            ->groupBy('1', '2');

        return $this->connection->fetchAllAssociative(
            'WITH listened AS (' . $listened->getSQL() . '), playlist_songs AS (' . self::PLAYLIST_SONGS . ')' . $sql,
            [...$listened->getParameters(), ...$params],
        );
    }
}
