<?php

namespace App\Tests\Stats;

use App\Entity\Play;
use App\Entity\Playlist;
use App\Entity\PlaylistTrack;
use App\Entity\Track;
use App\Entity\User;
use App\Spotify\Model\Playlist as SpotifyPlaylist;
use App\Stats\PlayFilter;
use App\Stats\Songs;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

/**
 * Song A sous deux ids (album et single, casse différente) : écouté deux fois sous chaque id, dont une fois
 * moins de 30 s. Rangé dans Road trip (single), Mix (album) et les likes (album).
 */
class SongsTest extends KernelTestCase
{
    private EntityManagerInterface $em;

    private User $user;

    protected function setUp(): void
    {
        $this->em = static::getContainer()->get(EntityManagerInterface::class);
        foreach ([User::class, Track::class] as $entity) {
            $this->em->createQuery('DELETE FROM ' . $entity)->execute();
        }

        $this->user = new User('me')->setDisplayName('Jane Doe');
        $album = new Track('0000000000000000album1', 'Song A', 'Artist A', 'Album');
        $single = new Track('000000000000000single1', 'SONG A', 'artist a', 'Song A - Single');
        $liked = new Playlist($this->user, Playlist::LIKED)->updateAsLiked()->markSynced('v1');
        foreach ([$this->user, $album, $single, $liked, $roadTrip = $this->playlist('road-trip'), $mix = $this->playlist('mix')] as $entity) {
            $this->em->persist($entity);
        }
        $this->em->persist(new Play($this->user, $album, new \DateTimeImmutable('2021-01-01T10:00:00Z'), 200000, false, 'clickrow', 'trackdone'));
        $this->em->persist(new Play($this->user, $album, new \DateTimeImmutable('2021-01-02T10:00:00Z'), 12000, true, 'clickrow', 'fwdbtn'));
        $this->em->persist(new Play($this->user, $single, new \DateTimeImmutable('2021-01-03T10:00:00Z'), 30000, false, 'clickrow', 'trackdone'));
        $this->em->persist(new PlaylistTrack($roadTrip, 0, $single, null));
        $this->em->persist(new PlaylistTrack($mix, 0, $album, null));
        $this->em->persist(new PlaylistTrack($liked, 0, $album, new \DateTimeImmutable('2021-06-01T10:00:00Z')));
        $this->em->flush();
    }

    public function testListenedGroupsIdsOfTheSameSongAndOnlyCountsPlaysOverThirtySeconds(): void
    {
        self::assertSame([['name' => 'song a', 'artist' => 'artist a', 'plays' => 2, 'starts' => 3, 'skips' => 1]], $this->with(
            'SELECT name, artist, plays, starts, skips FROM listened',
        ));
    }

    public function testPlaylistSongsCountCopiesWithoutLikes(): void
    {
        self::assertSame([['name' => 'song a', 'copies' => 2, 'liked' => true]], $this->with(
            'SELECT name, copies, liked FROM playlist_songs',
        ));
    }

    public function testArtistFilterIgnoresCase(): void
    {
        $plays = static::getContainer()->get(Songs::class)->plays($this->user, new PlayFilter(artist: 'ARTIST A'))
            ->select('COUNT(*)')
            ->fetchOne();

        self::assertSame(3, $plays);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function with(string $sql): array
    {
        return static::getContainer()->get(Songs::class)->with($this->user, new PlayFilter(), $sql);
    }

    private function playlist(string $id): Playlist
    {
        return new Playlist($this->user, $id)
            ->update(new SpotifyPlaylist($id, $id, 'me', 'Jane Doe', false, 'v1', null))
            ->markSynced('v1');
    }
}
