<?php

namespace App\Tests\Controller;

use App\Entity\Track;
use App\Entity\User;
use App\Stats\Preview;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpClient\MockHttpClient;
use Symfony\Component\HttpClient\Response\JsonMockResponse;

class PreviewControllerTest extends WebTestCase
{
    private const string TRACK_ID = '4uLU6hMCjMI75M1A2tKUQC';
    private const string ISRC = 'USUM71703861';
    private const string PREVIEW_URL = 'https://cdnt-preview.dzcdn.net/api/1/1/f/2/c/0/preview.mp3';

    private KernelBrowser $client;
    private User $user;

    protected function setUp(): void
    {
        $this->client = static::createClient();

        $em = static::getContainer()->get(EntityManagerInterface::class);
        foreach ([User::class, Track::class] as $entity) {
            $em->createQuery('DELETE FROM ' . $entity)->execute();
        }

        $this->user = new User('spotify-user-1')
            ->setDisplayName('Jane Doe')
            ->updateTokens('access-token', 'refresh-token', new \DateTimeImmutable('+1 hour'));
        $em->persist($this->user);
        $em->flush();

        $this->client->loginUser($this->user);
    }

    public function testFoundTrackRedirectsToDeezerPreviewAndKeepsItInCache(): void
    {
        $spotify = $this->mockSpotify(self::ISRC);
        $deezer = $this->mockDeezer([
            'track/isrc:' . self::ISRC => ['id' => 363747251, 'preview' => self::PREVIEW_URL],
        ]);

        $this->client->request('GET', '/api/preview/track/' . self::TRACK_ID);

        self::assertResponseRedirects(self::PREVIEW_URL);
        self::assertResponseHeaderSame('Cache-Control', 'max-age=300, private');
        self::assertSame(self::PREVIEW_URL, $this->preview());
        // La recherche par ISRC donne déjà l'URL
        self::assertSame(1, $spotify->getRequestsCount());
        self::assertSame(1, $deezer->getRequestsCount());
    }

    public function testTrackUnknownByIsrcIsFoundByNameAndArtist(): void
    {
        $this->mockSpotify(self::ISRC);
        $this->mockDeezer([
            'search' => ['data' => [
                ['id' => 1, 'title' => 'Song A (8-Bit Emulation)', 'artist' => ['name' => 'Artist A'], 'preview' => 'https://cover'],
                ['id' => 2, 'title' => 'Song A', 'artist' => ['name' => '8-Bit Arcade'], 'preview' => 'https://cover'],
                ['id' => 3, 'title' => 'song a', 'artist' => ['name' => 'artist a'], 'preview' => self::PREVIEW_URL],
            ]],
        ]);

        $this->client->request('GET', '/api/preview/track/' . self::TRACK_ID);

        self::assertResponseRedirects(self::PREVIEW_URL);
    }

    public function testTrackMissingFromDeezerHasNoPreviewAndIsNotLookedUpAgain(): void
    {
        $spotify = $this->mockSpotify(self::ISRC);
        $deezer = $this->mockDeezer(['search' => ['data' => [], 'total' => 0]]);

        $this->client->request('GET', '/api/preview/track/' . self::TRACK_ID);

        self::assertResponseStatusCodeSame(404);
        self::assertNull($this->preview());
        self::assertSame(1, $spotify->getRequestsCount());
        self::assertSame(2, $deezer->getRequestsCount());
    }

    public function testTrackWithoutIsrcIsOnlySearchedByName(): void
    {
        $this->mockSpotify(null);
        $deezer = $this->mockDeezer([
            'search' => ['data' => [['id' => 3, 'title' => 'Song A', 'artist' => ['name' => 'Artist A'], 'preview' => self::PREVIEW_URL]]],
        ]);

        $this->client->request('GET', '/api/preview/track/' . self::TRACK_ID);

        self::assertResponseRedirects(self::PREVIEW_URL);
        self::assertSame(1, $deezer->getRequestsCount());
    }

    public function testDeezerErrorGivesNotFoundWithoutCaching(): void
    {
        $spotify = $this->mockSpotify(self::ISRC);
        // Quota dépassé, puis rétabli
        static::getContainer()->set('deezer.client', new MockHttpClient([
            new JsonMockResponse(['error' => ['type' => 'Exception', 'message' => 'Quota limit exceeded', 'code' => 4]]),
            new JsonMockResponse(['id' => 363747251, 'preview' => self::PREVIEW_URL]),
        ], 'https://api.deezer.com/'));

        $this->client->request('GET', '/api/preview/track/' . self::TRACK_ID);

        self::assertResponseStatusCodeSame(404);
        self::assertSame(self::PREVIEW_URL, $this->preview());
        self::assertSame(2, $spotify->getRequestsCount());
    }

    private function preview(): ?string
    {
        return static::getContainer()->get(Preview::class)->forTrack($this->user, self::TRACK_ID);
    }

    private function mockSpotify(?string $isrc): MockHttpClient
    {
        $mock = new MockHttpClient(static fn (): JsonMockResponse => new JsonMockResponse([
            'id' => self::TRACK_ID,
            'uri' => 'spotify:track:' . self::TRACK_ID,
            'name' => 'Song A',
            'artists' => [['id' => 'artist-a', 'name' => 'Artist A']],
            'album' => ['name' => 'Album A', 'images' => []],
            'duration_ms' => 200000,
            'external_ids' => null === $isrc ? [] : ['isrc' => $isrc],
        ]), 'https://api.spotify.com/v1/');
        static::getContainer()->set('spotify.client', $mock);

        return $mock;
    }

    /**
     * @param array<string, array<string, mixed>> $responses réponse par chemin, « introuvable » sinon (en 200, comme Deezer)
     */
    private function mockDeezer(array $responses): MockHttpClient
    {
        $mock = new MockHttpClient(static fn (string $method, string $url): JsonMockResponse => new JsonMockResponse(
            $responses[ltrim((string) parse_url($url, \PHP_URL_PATH), '/')]
                ?? ['error' => ['type' => 'DataException', 'message' => 'no data', 'code' => 800]],
        ), 'https://api.deezer.com/');
        static::getContainer()->set('deezer.client', $mock);

        return $mock;
    }
}
