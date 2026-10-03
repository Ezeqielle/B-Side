<?php

namespace App\Tests\Controller;

use App\Entity\Playlist;
use App\Entity\PlaylistTrack;
use App\Entity\Track;
use App\Entity\User;
use App\History\StreamedPlay;
use App\History\StreamingHistoryParser;
use App\Message\ImportPlays;
use App\MessageHandler\ImportPlaysHandler;
use App\Spotify\Model\Playlist as SpotifyPlaylist;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

/**
 * Fixture : Artist A écouté le 1er mars 2020 et le 31 décembre 2021 à 23:59 UTC, Artist B passé après 12 s.
 */
class StatsControllerTest extends WebTestCase
{
    private KernelBrowser $client;

    protected function setUp(): void
    {
        $this->client = static::createClient();

        $em = static::getContainer()->get(EntityManagerInterface::class);
        // Écoutes et playlists sont supprimées avec l'utilisateur (ON DELETE CASCADE)
        foreach ([User::class, Track::class] as $entity) {
            $em->createQuery('DELETE FROM ' . $entity)->execute();
        }

        $user = new User('spotify-user-1')->setDisplayName('Jane Doe');
        $em->persist($user);
        $em->flush();
        $this->client->loginUser($user);

        $json = (string) file_get_contents(__DIR__ . '/../fixtures/Streaming_History_Audio_2020-2021.json');
        $plays = static::getContainer()->get(StreamingHistoryParser::class)->parse($json);
        static::getContainer()->get(ImportPlaysHandler::class)(new ImportPlays((int) $user->getId(), $plays));
    }

    public function testOverviewCountsOnlyPlaysOverThirtySeconds(): void
    {
        $overview = $this->get('/api/stats/overview');

        self::assertSame(2, $overview['plays']);
        self::assertSame(422000, $overview['msPlayed']);
        self::assertSame(2, $overview['tracks']);
        self::assertSame(2, $overview['artists']);
        self::assertEqualsWithDelta(1 / 3, $overview['skipRate'], 0.001);
    }

    public function testTopTracksAndArtists(): void
    {
        $tracks = $this->get('/api/stats/tracks');

        self::assertCount(1, $tracks, 'Un titre jamais écouté plus de 30 s n\'est pas classé');
        self::assertSame('4uLU6hMCjMI75M1A2tKUQC', $tracks[0]['id']);
        self::assertSame(2, $tracks[0]['plays']);
        self::assertEquals(new \DateTimeImmutable('2021-12-31T23:59:59Z'), new \DateTimeImmutable($tracks[0]['lastPlayedAt']));

        self::assertSame([], $this->get('/api/stats/tracks?offset=1'));

        $artists = $this->get('/api/stats/artists?limit=1');

        self::assertSame([['name' => 'Artist A', 'plays' => 2, 'msPlayed' => 410000, 'tracks' => 1]], $artists);
    }

    public function testPeriodUsesTheUserTimezone(): void
    {
        // 2021-12-31 23:59 UTC, c'est déjà 2022 à Paris
        self::assertSame(0, $this->get('/api/stats/overview?from=2021-01-01&to=2021-12-31&tz=Europe/Paris')['plays']);
        self::assertSame(1, $this->get('/api/stats/overview?from=2021-01-01&to=2021-12-31')['plays']);
        self::assertSame(1, $this->get('/api/stats/overview?from=2022-01-01&tz=Europe/Paris')['plays']);
    }

    public function testArtistFilter(): void
    {
        $overview = $this->get('/api/stats/overview?artist=Artist%20B');

        self::assertSame(0, $overview['plays']);
        self::assertSame(1, $overview['tracks']);
        self::assertEqualsWithDelta(1.0, $overview['skipRate'], 0.001);
    }

    public function testTimelineAndClockInTheUserTimezone(): void
    {
        self::assertSame([
            ['month' => '2020-03', 'plays' => 1, 'msPlayed' => 222000],
            ['month' => '2022-01', 'plays' => 1, 'msPlayed' => 200000],
        ], $this->get('/api/stats/timeline?tz=Europe/Paris'));

        $clock = $this->get('/api/stats/clock?tz=Europe/Paris');
        usort($clock, static fn (array $a, array $b): int => [$a['weekday'], $a['hour']] <=> [$b['weekday'], $b['hour']]);

        // Dimanche 1er mars 2020 à 11h, samedi 1er janvier 2022 à 0h
        self::assertSame([
            ['weekday' => 6, 'hour' => 0, 'plays' => 1],
            ['weekday' => 7, 'hour' => 11, 'plays' => 1],
        ], $clock);
    }

    public function testSongHistory(): void
    {
        $song = $this->get('/api/stats/tracks/4uLU6hMCjMI75M1A2tKUQC?tz=Europe/Paris');

        self::assertSame(2, $song['plays']);
        self::assertSame(410000, $song['msPlayed']);
        self::assertEquals(new \DateTimeImmutable('2020-03-01T10:00:00Z'), new \DateTimeImmutable($song['firstPlayedAt']));
        self::assertEquals(new \DateTimeImmutable('2021-12-31T23:59:59Z'), new \DateTimeImmutable($song['lastPlayedAt']));
        self::assertSame([
            ['month' => '2020-03', 'plays' => 1, 'msPlayed' => 210000],
            ['month' => '2022-01', 'plays' => 1, 'msPlayed' => 200000],
        ], $song['months']);
        // Une écoute le samedi à 0h, une le dimanche à 11h : à égalité, le premier jour et la première heure
        self::assertSame(6, $song['topWeekday']);
        self::assertSame(0, $song['topHour']);
        self::assertNull($song['likedAt']);
        self::assertSame([], $song['playlists']);
    }

    public function testSongHistoryGroupsVersionsWithLikeAndPlaylists(): void
    {
        $em = static::getContainer()->get(EntityManagerInterface::class);
        $user = $em->getRepository(User::class)->findOneBy([]);
        self::assertNotNull($user);

        // Version single du même morceau, jamais écoutée sous cet id
        $single = new Track('0000000000000000single', 'SONG A', 'artist a', 'Song A - Single');
        $liked = new Playlist($user, Playlist::LIKED)->updateAsLiked()->markSynced('liked-1');
        $playlist = new Playlist($user, '37i9dQZF1DXcBWIGoYBM5M')
            ->update(new SpotifyPlaylist('37i9dQZF1DXcBWIGoYBM5M', 'Road trip', 'spotify-user-1', 'Jane Doe', false, 'snap-1', null))
            ->markSynced('snap-1');
        foreach ([$single, $liked, $playlist] as $entity) {
            $em->persist($entity);
        }
        $em->persist(new PlaylistTrack($liked, 0, $single, new \DateTimeImmutable('2021-06-15T08:00:00Z')));
        $em->persist(new PlaylistTrack($playlist, 0, $single, null));
        $em->flush();

        $song = $this->get('/api/stats/tracks/0000000000000000single');

        self::assertSame(2, $song['plays']);
        self::assertEquals(new \DateTimeImmutable('2021-06-15T08:00:00Z'), new \DateTimeImmutable($song['likedAt']));
        self::assertSame([['id' => '37i9dQZF1DXcBWIGoYBM5M', 'name' => 'Road trip', 'imageUrl' => null]], $song['playlists']);
    }

    public function testStatsAreKeptUntilTheNextImport(): void
    {
        // Le même conteneur pour les requêtes et l'import, et donc le même cache
        $this->client->disableReboot();
        self::assertSame(2, $this->get('/api/stats/overview')['plays']);

        $user = static::getContainer()->get(EntityManagerInterface::class)->getRepository(User::class)->findOneBy([]);
        static::getContainer()->get(ImportPlaysHandler::class)(new ImportPlays((int) $user?->getId(), [
            new StreamedPlay('4uLU6hMCjMI75M1A2tKUQC', 'Song A', 'Artist A', 'Album A', new \DateTimeImmutable('2023-05-01T10:00:00Z'), 200000, false, 'clickrow', 'trackdone'),
        ]));

        self::assertSame(3, $this->get('/api/stats/overview')['plays']);
    }

    public function testInvalidFilterIsRejected(): void
    {
        $this->client->request('GET', '/api/stats/overview?from=2021-01-01&to=2020-01-01');
        self::assertResponseStatusCodeSame(404);

        $this->client->request('GET', '/api/stats/overview?tz=Mars/Olympus');
        self::assertResponseStatusCodeSame(404);

        $this->client->request('GET', '/api/stats/tracks?limit=1000');
        self::assertResponseStatusCodeSame(404);

        $this->client->request('GET', '/api/stats/tracks?offset=-1');
        self::assertResponseStatusCodeSame(404);
    }

    /**
     * @return array<mixed>
     */
    private function get(string $url): array
    {
        $this->client->request('GET', $url);
        self::assertResponseIsSuccessful();

        return json_decode((string) $this->client->getResponse()->getContent(), true);
    }
}
