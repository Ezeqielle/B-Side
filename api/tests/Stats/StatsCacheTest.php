<?php

namespace App\Tests\Stats;

use App\Entity\Play;
use App\Entity\Track;
use App\Entity\User;
use App\Stats\PlayFilter;
use App\Stats\PlayStats;
use App\Stats\StatsCache;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

/**
 * Les modules de stats se mettent en cache, par utilisateur et par arguments.
 */
class StatsCacheTest extends KernelTestCase
{
    private EntityManagerInterface $em;

    private User $user;

    private Track $track;

    protected function setUp(): void
    {
        $this->em = static::getContainer()->get(EntityManagerInterface::class);
        foreach ([User::class, Track::class] as $entity) {
            $this->em->createQuery('DELETE FROM ' . $entity)->execute();
        }

        $this->user = new User('me')->setDisplayName('Jane Doe');
        $this->track = new Track('0000000000000000album1', 'Song A', 'Artist A', 'Album');
        $this->em->persist($this->user);
        $this->em->persist($this->track);
        $this->play('2021-01-01T10:00:00Z');
        $this->play('2022-01-01T10:00:00Z');
        static::getContainer()->get(StatsCache::class)->clear((int) $this->user->getId());
    }

    public function testEachFilterHasItsOwnResultUntilTheCacheIsCleared(): void
    {
        $stats = static::getContainer()->get(PlayStats::class);
        $year2021 = new PlayFilter(from: new \DateTimeImmutable('2021-01-01'), to: new \DateTimeImmutable('2021-12-31'));

        self::assertSame(2, $stats->overview($this->user, new PlayFilter())->plays);
        self::assertSame(1, $stats->overview($this->user, $year2021)->plays);

        $this->play('2021-06-01T10:00:00Z');
        self::assertSame(1, $stats->overview($this->user, $year2021)->plays, 'Gardé en cache');

        static::getContainer()->get(StatsCache::class)->clear((int) $this->user->getId());
        self::assertSame(2, $stats->overview($this->user, $year2021)->plays);
    }

    private function play(string $playedAt): void
    {
        $this->em->persist(new Play($this->user, $this->track, new \DateTimeImmutable($playedAt), 200000, false, 'clickrow', 'trackdone'));
        $this->em->flush();
    }
}
