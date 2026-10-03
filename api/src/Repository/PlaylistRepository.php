<?php

namespace App\Repository;

use App\Entity\Playlist;
use App\Entity\User;
use App\Spotify\Model\PlaylistItem;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Playlist>
 */
class PlaylistRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Playlist::class);
    }

    /**
     * @return array<string, Playlist> par id Spotify
     */
    public function findByUserIndexed(User $user): array
    {
        return $this->createQueryBuilder('p', 'p.spotifyId')
            ->where('p.user = :user')
            ->setParameter('user', $user)
            ->getQuery()
            ->getResult();
    }

    public function findOneReadable(User $user, string $spotifyId): ?Playlist
    {
        return $this->findOneBy(['user' => $user, 'spotifyId' => $spotifyId, 'readable' => true]);
    }

    /**
     * Remplace le contenu de la playlist. Les titres doivent exister (TrackRepository::saveFromSpotify()).
     *
     * @param list<PlaylistItem> $items
     */
    public function replaceTracks(Playlist $playlist, array $items): void
    {
        $rows = array_map(static fn (PlaylistItem $item, int $position): array => [
            'position' => $position,
            'track_id' => $item->track->id,
            'added_at' => $item->addedAt?->format(\DATE_ATOM),
        ], $items, array_keys($items));

        $connection = $this->getEntityManager()->getConnection();
        $connection->transactional(static function () use ($connection, $playlist, $rows): void {
            $connection->executeStatement('DELETE FROM playlist_track WHERE playlist_id = ?', [$playlist->getId()]);
            if ([] === $rows) {
                return;
            }
            $connection->executeStatement(<<<'SQL'
                INSERT INTO playlist_track (playlist_id, position, track_id, added_at)
                SELECT CAST(:playlist AS integer), t.*
                FROM json_to_recordset(:tracks) AS t(position integer, track_id varchar, added_at timestamptz)
                SQL, ['playlist' => $playlist->getId(), 'tracks' => json_encode($rows, \JSON_THROW_ON_ERROR)]);
        });
    }
}
