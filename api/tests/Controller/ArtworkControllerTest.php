<?php

namespace App\Tests\Controller;

use App\Entity\Track;
use App\Entity\User;
use App\Stats\Artwork;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpClient\MockHttpClient;
use Symfony\Component\HttpClient\Response\JsonMockResponse;

class ArtworkControllerTest extends WebTestCase
{
    private const string TRACK_ID = '4uLU6hMCjMI75M1A2tKUQC';

    private KernelBrowser $client;

    protected function setUp(): void
    {
        $this->client = static::createClient();

        $em = static::getContainer()->get(EntityManagerInterface::class);
        // Écoutes et playlists sont supprimées avec l'utilisateur (ON DELETE CASCADE)
        foreach ([User::class, Track::class] as $entity) {
            $em->createQuery('DELETE FROM ' . $entity)->execute();
        }

        $user = new User('spotify-user-1')
            ->setDisplayName('Jane Doe')
            ->updateTokens('access-token', 'refresh-token', new \DateTimeImmutable('+1 hour'));
        $em->persist($user);
        $em->persist(new Track(self::TRACK_ID, 'Song A', 'Artist A', 'Album A'));
        $em->flush();

        $this->client->loginUser($user);
    }

    public function testTrackRedirectsToAlbumCoverAndKeepsItInCache(): void
    {
        $mock = $this->mockSpotify();

        $this->client->request('GET', '/api/artwork/track/' . self::TRACK_ID);

        self::assertResponseRedirects('https://i.scdn.co/image/cover');
        self::assertResponseHeaderSame('Cache-Control', 'max-age=86400, private');

        $user = static::getContainer()->get(EntityManagerInterface::class)->getRepository(User::class)->findOneBy([]);
        self::assertNotNull($user);
        self::assertSame('https://i.scdn.co/image/cover', static::getContainer()->get(Artwork::class)->forTrack($user, self::TRACK_ID));
        self::assertSame(1, $mock->getRequestsCount());
    }

    public function testArtistIsFoundThroughOneOfItsTracks(): void
    {
        $this->mockSpotify();

        $this->client->request('GET', '/api/artwork/artist?name=Artist%20A');

        self::assertResponseRedirects('https://i.scdn.co/image/artist-a');
    }

    public function testUnknownArtistHasNoImage(): void
    {
        $mock = $this->mockSpotify();

        $this->client->request('GET', '/api/artwork/artist?name=Nobody');

        self::assertResponseStatusCodeSame(404);
        self::assertSame(0, $mock->getRequestsCount());
    }

    public function testSpotifyErrorGivesNotFound(): void
    {
        static::getContainer()->set('spotify.client', new MockHttpClient(
            new JsonMockResponse(['error' => ['status' => 429]], ['http_code' => 429]),
            'https://api.spotify.com/v1/',
        ));

        $this->client->request('GET', '/api/artwork/track/' . self::TRACK_ID);

        self::assertResponseStatusCodeSame(404);
    }

    private function mockSpotify(): MockHttpClient
    {
        $mock = new MockHttpClient(static fn (string $method, string $url): JsonMockResponse => match ($url) {
            'https://api.spotify.com/v1/tracks/' . self::TRACK_ID => new JsonMockResponse([
                'id' => self::TRACK_ID,
                'uri' => 'spotify:track:' . self::TRACK_ID,
                'name' => 'Song A',
                'artists' => [['id' => 'feat', 'name' => 'Featuring'], ['id' => 'artist-a', 'name' => 'artist a']],
                'album' => ['name' => 'Album A', 'images' => [['url' => 'https://i.scdn.co/image/cover']]],
                'duration_ms' => 200000,
            ]),
            'https://api.spotify.com/v1/artists/artist-a' => new JsonMockResponse([
                'id' => 'artist-a',
                'name' => 'Artist A',
                'images' => [['url' => 'https://i.scdn.co/image/artist-a']],
            ]),
            default => new JsonMockResponse(['error' => ['status' => 404]], ['http_code' => 404]),
        }, 'https://api.spotify.com/v1/');
        static::getContainer()->set('spotify.client', $mock);

        return $mock;
    }
}
