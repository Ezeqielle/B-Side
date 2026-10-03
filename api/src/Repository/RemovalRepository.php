<?php

namespace App\Repository;

use App\Entity\Removal;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Removal>
 */
class RemovalRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Removal::class);
    }

    /**
     * Journal des retraits, les plus récents d'abord.
     *
     * @return list<Removal>
     */
    public function findByUser(User $user): array
    {
        return $this->createQueryBuilder('r')
            ->addSelect('t')
            ->innerJoin('r.track', 't')
            ->where('r.user = :user')
            ->setParameter('user', $user)
            ->orderBy('r.removedAt', 'DESC')
            ->addOrderBy('r.playlistName')
            ->addOrderBy('r.position')
            ->getQuery()
            ->getResult();
    }

    /**
     * Retraits pas encore annulés parmi `$ids`, par playlist et dans leur ordre d'origine.
     *
     * @param list<int> $ids
     *
     * @return list<Removal>
     */
    public function findPending(User $user, array $ids): array
    {
        return $this->createQueryBuilder('r')
            ->addSelect('t')
            ->innerJoin('r.track', 't')
            ->where('r.user = :user AND r.id IN (:ids) AND r.restoredAt IS NULL')
            ->setParameter('user', $user)
            ->setParameter('ids', $ids)
            ->orderBy('r.playlistId')
            ->addOrderBy('r.position')
            ->getQuery()
            ->getResult();
    }

    /**
     * Titres dans la corbeille : ceux d'un retrait pas encore annulé.
     *
     * @return list<string> ids Spotify
     */
    public function findTrashedTrackIds(User $user): array
    {
        /** @var list<string> $ids */
        $ids = $this->createQueryBuilder('r')
            ->select('DISTINCT IDENTITY(r.track)')
            ->where('r.user = :user AND r.restoredAt IS NULL')
            ->setParameter('user', $user)
            ->getQuery()
            ->getSingleColumnResult();

        return $ids;
    }
}
