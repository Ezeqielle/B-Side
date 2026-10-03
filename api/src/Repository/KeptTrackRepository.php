<?php

namespace App\Repository;

use App\Entity\KeptTrack;
use App\Entity\Playlist;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<KeptTrack>
 */
class KeptTrackRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, KeptTrack::class);
    }

    /**
     * Titres à garder de la playlist, les plus récents d'abord.
     *
     * @return list<KeptTrack>
     */
    public function findByPlaylist(Playlist $playlist): array
    {
        return $this->createQueryBuilder('k')
            ->addSelect('t')
            ->innerJoin('k.track', 't')
            ->where('k.playlist = :playlist')
            ->setParameter('playlist', $playlist)
            ->orderBy('k.keptAt', 'DESC')
            ->addOrderBy('t.name')
            ->getQuery()
            ->getResult();
    }

    /**
     * @param list<string> $trackIds ids Spotify
     */
    public function deleteTracks(Playlist $playlist, array $trackIds): void
    {
        $this->createQueryBuilder('k')
            ->delete()
            ->where('k.playlist = :playlist AND k.track IN (:tracks)')
            ->setParameter('playlist', $playlist)
            ->setParameter('tracks', $trackIds)
            ->getQuery()
            ->execute();
    }
}
