<?php

namespace App\Tests\Controller;

use App\Entity\Track;
use App\Entity\User;
use App\History\StreamingHistoryParser;
use App\Message\ImportPlays;
use App\Message\SyncPlaylists;
use App\MessageHandler\ImportPlaysHandler;
use App\MessageHandler\SyncPlaylistsHandler;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpClient\MockHttpClient;
use Symfony\Component\HttpClient\Response\JsonMockResponse;
use Symfony\Component\Messenger\Transport\InMemory\InMemoryTransport;

/**
 * Historique (fixture) : Song A écouté deux fois, Song B passé après 12 s.
 *
 * Playlists sur Spotify :
 * - Road trip : Song B, Song C, un fichier local
 * - Mix : « song a » sous un autre id (autre album), Song C
 * - Découvertes : suivie, d'un autre utilisateur
 * - Collab : collaborative, mais Spotify en refuse le contenu
 * - Titres likés : Song A et Song C
 */
class PlaylistControllerTest extends WebTestCase
{
    private const string SONG_A = '4uLU6hMCjMI75M1A2tKUQC';
    private const string SONG_A_OTHER_ALBUM = '0000000000000000000001';
    private const string SONG_B = '7ouMYWpwJ422jRcDASZB7P';
    private const string SONG_C = '0000000000000000000003';

    private KernelBrowser $client;

    private MockHttpClient $spotify;

    /** @var array<string, string> snapshot_id de chaque playlist sur Spotify */
    private array $snapshots = ['road-trip' => 'v1', 'mix' => 'v1', 'discover' => 'v1', 'collab' => 'v1'];

    /** @var list<array<string, mixed>>|null titres likés sur Spotify, du plus récent au plus ancien, null si refusés */
    private ?array $likes;

    protected function setUp(): void
    {
        $this->client = static::createClient();
        // Le même conteneur pour les requêtes et les synchros, et donc le même faux Spotify
        $this->client->disableReboot();
        $this->spotify = $this->mockSpotify();
        $this->likes = [
            $this->item(self::SONG_A, 'Song A', 'Artist A', '2026-03-01T10:00:00Z', 'track'),
            $this->item(self::SONG_C, 'Song C', 'Artist C', '2026-01-15T10:00:00Z', 'track'),
        ];

        $em = static::getContainer()->get(EntityManagerInterface::class);
        // Écoutes et playlists sont supprimées avec l'utilisateur (ON DELETE CASCADE)
        foreach ([User::class, Track::class] as $entity) {
            $em->createQuery('DELETE FROM ' . $entity)->execute();
        }

        $user = new User('me')
            ->setDisplayName('Jane Doe')
            ->updateTokens('access-token', 'refresh-token', new \DateTimeImmutable('+1 hour'));
        $em->persist($user);
        $em->flush();
        $this->client->loginUser($user);

        $json = (string) file_get_contents(__DIR__ . '/../fixtures/Streaming_History_Audio_2020-2021.json');
        $plays = static::getContainer()->get(StreamingHistoryParser::class)->parse($json);
        static::getContainer()->get(ImportPlaysHandler::class)(new ImportPlays((int) $user->getId(), $plays));
    }

    public function testSyncIsQueued(): void
    {
        $this->client->request('POST', '/api/playlists/sync');

        self::assertResponseStatusCodeSame(202);
        /** @var InMemoryTransport $transport */
        $transport = static::getContainer()->get('messenger.transport.async');
        $messages = array_map(static fn ($envelope) => $envelope->getMessage(), $transport->getSent());
        self::assertEquals([new SyncPlaylists($this->userId())], $messages);
    }

    public function testOverviewCrossesPlaylistsWithHistory(): void
    {
        self::assertNull($this->get('/api/playlists/overview')['syncedAt']);

        $this->sync();
        $overview = $this->get('/api/playlists/overview');

        self::assertNotNull($overview['syncedAt']);
        self::assertSame(2, $overview['playlists'], 'Sans les titres likés');
        self::assertSame(2, $overview['unreadable'], 'Playlist suivie et playlist refusée par Spotify');
        self::assertSame(3, $overview['tracks']);
        self::assertSame(2, $overview['neverPlayed'], 'Song B (écouté moins de 30 s) et Song C');
        self::assertSame(1, $overview['duplicates'], 'Song C, et pas Song A, à la fois dans Mix et liké');
    }

    public function testPlaylistsList(): void
    {
        $this->sync();
        $playlists = $this->get('/api/playlists');

        self::assertSame(['Mix', 'Road trip', 'Titres likés'], array_column($playlists, 'name'));

        [$mix, $roadTrip] = $playlists;
        self::assertSame('mix', $mix['id']);
        self::assertSame(2, $mix['tracks']);
        self::assertSame(1, $mix['neverPlayed'], 'Song A est reconnu malgré un autre id et une autre casse');
        self::assertEquals(new \DateTimeImmutable('2021-12-31T23:59:59Z'), new \DateTimeImmutable($mix['lastPlayedAt']));

        self::assertSame(2, $roadTrip['tracks'], 'Le fichier local est ignoré');
        self::assertSame(2, $roadTrip['artists']);
        self::assertSame(400000, $roadTrip['durationMs']);
        self::assertSame(2, $roadTrip['neverPlayed']);
        self::assertEqualsWithDelta(1.0, $roadTrip['skipRate'], 0.001);
        self::assertNull($roadTrip['lastPlayedAt']);
        self::assertEquals(new \DateTimeImmutable('2026-02-01T10:00:00Z'), new \DateTimeImmutable($roadTrip['lastAddedAt']));
    }

    public function testPlaylistTracks(): void
    {
        $this->sync();
        $tracks = $this->get('/api/playlists/mix/tracks');

        self::assertSame([0, 1], array_column($tracks, 'position'));
        self::assertSame([self::SONG_A_OTHER_ALBUM, self::SONG_C], array_column($tracks, 'id'));
        self::assertSame([2, 0], array_column($tracks, 'plays'));
        self::assertNull($tracks[1]['lastPlayedAt']);

        $this->client->request('GET', '/api/playlists/discover/tracks');
        self::assertResponseStatusCodeSame(404, 'Contenu inconnu');

        $this->client->request('GET', '/api/playlists/nope/tracks');
        self::assertResponseStatusCodeSame(404);
    }

    public function testLikedTracksAreAPlaylist(): void
    {
        $this->sync();

        $liked = array_column($this->get('/api/playlists'), null, 'id')['liked'];
        self::assertSame('Jane Doe', $liked['ownerName']);
        self::assertNull($liked['imageUrl']);
        self::assertSame(2, $liked['tracks']);
        self::assertSame(1, $liked['neverPlayed'], 'Song C');
        self::assertEquals(new \DateTimeImmutable('2026-03-01T10:00:00Z'), new \DateTimeImmutable($liked['lastAddedAt']));

        $tracks = $this->get('/api/playlists/liked/tracks');
        self::assertSame([self::SONG_A, self::SONG_C], array_column($tracks, 'id'));
        self::assertSame([2, 0], array_column($tracks, 'plays'));
    }

    public function testRefusedLikedTracks(): void
    {
        $this->likes = null;
        $this->sync();

        self::assertSame(['Mix', 'Road trip'], array_column($this->get('/api/playlists'), 'name'));
        self::assertSame(2, $this->get('/api/playlists/overview')['unreadable'], 'Les likes ne sont pas une playlist suivie');
        $this->client->request('GET', '/api/playlists/liked/tracks');
        self::assertResponseStatusCodeSame(404);
    }

    public function testDuplicatesAndTracksMissingFromPlaylists(): void
    {
        self::assertSame([self::SONG_A], array_column($this->get('/api/playlists/missing'), 'id'));

        $this->sync();

        self::assertSame([[
            'id' => self::SONG_C,
            'name' => 'Song C',
            'artistName' => 'Artist C',
            'playlists' => ['Mix', 'Road trip'],
        ]], $this->get('/api/playlists/duplicates'));
        self::assertSame([], $this->get('/api/playlists/missing'));
    }

    public function testResyncOnlyReadsChangedPlaylistsAndDropsRemovedOnes(): void
    {
        $this->sync();

        $this->snapshots['mix'] = 'v2';
        unset($this->snapshots['road-trip']);
        self::assertSame(3, $this->sync(), 'La liste, le contenu de Mix seulement, et la première page des likes');
        self::assertSame(['Mix', 'Titres likés'], array_column($this->get('/api/playlists'), 'name'));
    }

    public function testLikedTracksAreOnlyReadAgainWhenTheyChange(): void
    {
        $this->likes = array_map($this->like(...), range(1, 60));
        $this->sync();

        self::assertSame(2, $this->sync(), 'La liste des playlists, et la première page des likes');

        array_pop($this->likes);
        self::assertSame(3, $this->sync(), 'Like retiré : relecture complète, en réutilisant la première page');
        self::assertCount(59, $this->get('/api/playlists/liked/tracks'));

        array_unshift($this->likes, $this->like(61));
        self::assertSame(3, $this->sync(), 'Like ajouté');
        self::assertSame($this->like(61)['track']['id'], $this->get('/api/playlists/liked/tracks')[0]['id']);
    }

    /**
     * @return int nombre de requêtes à Spotify
     */
    private function sync(): int
    {
        $before = $this->spotify->getRequestsCount();
        static::getContainer()->get(SyncPlaylistsHandler::class)(new SyncPlaylists($this->userId()));

        return $this->spotify->getRequestsCount() - $before;
    }

    private function mockSpotify(): MockHttpClient
    {
        $mock = new MockHttpClient(fn (string $method, string $url): JsonMockResponse => match (strtok($url, '?')) {
            'https://api.spotify.com/v1/me/playlists' => $this->page($url, array_map(fn (string $id): array => [
                'id' => $id,
                'name' => ['road-trip' => 'Road trip', 'mix' => 'Mix', 'discover' => 'Découvertes', 'collab' => 'Collab'][$id],
                'owner' => \in_array($id, ['road-trip', 'mix'], true)
                    ? ['id' => 'me', 'display_name' => 'Jane Doe']
                    : ['id' => 'someone', 'display_name' => 'Someone'],
                'collaborative' => 'collab' === $id,
                'snapshot_id' => $this->snapshots[$id],
                'images' => [],
            ], array_keys($this->snapshots))),
            'https://api.spotify.com/v1/playlists/road-trip/items' => $this->page($url, [
                $this->item(self::SONG_B, 'Song B', 'Artist B', '2026-01-01T10:00:00Z'),
                $this->item(self::SONG_C, 'Song C', 'Artist C', '2026-02-01T10:00:00Z'),
                ['is_local' => true, 'added_at' => '2026-02-01T10:00:00Z', 'item' => ['type' => 'track', 'id' => null, 'name' => 'Démo']],
            ]),
            'https://api.spotify.com/v1/playlists/mix/items' => $this->page($url, [
                $this->item(self::SONG_A_OTHER_ALBUM, 'song a', 'ARTIST A', '2026-01-01T10:00:00Z'),
                $this->item(self::SONG_C, 'Song C', 'Artist C', null),
            ]),
            'https://api.spotify.com/v1/me/tracks' => null !== $this->likes ? $this->page($url, $this->likes) : $this->forbidden(),
            default => $this->forbidden(),
        }, 'https://api.spotify.com/v1/');
        static::getContainer()->set('spotify.client', $mock);

        return $mock;
    }

    /**
     * Page demandée par `offset` et `limit`.
     *
     * @param list<array<string, mixed>> $items
     */
    private function page(string $url, array $items): JsonMockResponse
    {
        parse_str((string) parse_url($url, \PHP_URL_QUERY), $query);
        $offset = (int) ($query['offset'] ?? 0);
        $limit = (int) ($query['limit'] ?? 20);

        return new JsonMockResponse([
            'items' => \array_slice($items, $offset, $limit),
            'next' => $offset + $limit < \count($items) ? 'next-page' : null,
            'total' => \count($items),
        ]);
    }

    private function forbidden(): JsonMockResponse
    {
        return new JsonMockResponse(['error' => ['status' => 403]], ['http_code' => 403]);
    }

    /**
     * @param 'item'|'track' $key `item` dans le contenu d'une playlist, `track` dans les titres likés
     *
     * @return array<string, mixed>
     */
    private function item(string $id, string $name, string $artist, ?string $addedAt, string $key = 'item'): array
    {
        return [
            'added_at' => $addedAt,
            'is_local' => false,
            $key => [
                'type' => 'track',
                'id' => $id,
                'uri' => 'spotify:track:' . $id,
                'name' => $name,
                'artists' => [['id' => 'artist', 'name' => $artist]],
                'album' => ['name' => 'Album', 'artists' => [['name' => $artist]], 'images' => []],
                'duration_ms' => 200000,
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function like(int $i): array
    {
        return $this->item(\sprintf('L%021d', $i), 'Like ' . $i, 'Artist', '2026-01-01T10:00:00Z', 'track');
    }

    private function userId(): int
    {
        $user = static::getContainer()->get(EntityManagerInterface::class)->getRepository(User::class)->findOneBy(['spotifyId' => 'me']);

        return (int) $user?->getId();
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
