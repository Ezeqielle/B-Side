<?php

namespace App\Repository;

use App\Entity\Play;
use App\Entity\User;
use App\History\HistorySummary;
use App\History\StreamedPlay;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Play>
 */
class PlayRepository extends ServiceEntityRepository
{
    public function __construct(
        ManagerRegistry $registry,
        private readonly TrackRepository $trackRepository,
    ) {
        parent::__construct($registry, Play::class);
    }

    /**
     * Ajoute les écoutes en ignorant celles déjà enregistrées, avec leurs titres encore inconnus.
     *
     * @param list<StreamedPlay> $plays
     */
    public function insertMissing(int $userId, array $plays): void
    {
        $rows = array_map(static fn (StreamedPlay $play): array => [
            'track_id' => $play->trackId,
            'played_at' => $play->playedAt->format(\DATE_ATOM),
            'ms_played' => $play->msPlayed,
            'skipped' => $play->skipped,
            'reason_start' => $play->reasonStart,
            'reason_end' => $play->reasonEnd,
        ], $plays);

        $connection = $this->getEntityManager()->getConnection();
        $connection->transactional(function () use ($connection, $userId, $plays, $rows): void {
            $this->trackRepository->insertMissing($plays);
            $connection->executeStatement(<<<'SQL'
                INSERT INTO play (user_id, track_id, played_at, ms_played, skipped, reason_start, reason_end)
                SELECT CAST(:user AS integer), p.*
                FROM json_to_recordset(:plays) AS p(track_id varchar, played_at timestamptz, ms_played integer, skipped boolean, reason_start varchar, reason_end varchar)
                ON CONFLICT DO NOTHING
                SQL, ['user' => $userId, 'plays' => json_encode($rows, \JSON_THROW_ON_ERROR)]);
        });
    }

    public function summarize(User $user): HistorySummary
    {
        /** @var array{plays: int, tracks: int, firstPlayedAt: ?string, lastPlayedAt: ?string} $row */
        $row = $this->createQueryBuilder('p')
            ->select(
                'COUNT(p.id) AS plays',
                'COUNT(DISTINCT IDENTITY(p.track)) AS tracks',
                'MIN(p.playedAt) AS firstPlayedAt',
                'MAX(p.playedAt) AS lastPlayedAt',
            )
            ->where('p.user = :user')
            ->setParameter('user', $user)
            ->getQuery()
            ->getSingleResult();

        return new HistorySummary(
            plays: $row['plays'],
            tracks: $row['tracks'],
            firstPlayedAt: null !== $row['firstPlayedAt'] ? new \DateTimeImmutable($row['firstPlayedAt']) : null,
            lastPlayedAt: null !== $row['lastPlayedAt'] ? new \DateTimeImmutable($row['lastPlayedAt']) : null,
        );
    }
}
