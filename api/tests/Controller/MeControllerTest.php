<?php

namespace App\Tests\Controller;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpClient\MockHttpClient;
use Symfony\Component\HttpClient\Response\JsonMockResponse;

class MeControllerTest extends WebTestCase
{
    private KernelBrowser $client;

    protected function setUp(): void
    {
        $this->client = static::createClient();

        $em = static::getContainer()->get(EntityManagerInterface::class);
        $em->createQuery('DELETE FROM ' . User::class)->execute();

        $user = new User('spotify-user-1')
            ->setDisplayName('Jane Doe')
            ->setAvatarUrl('https://i.scdn.co/image/avatar')
            ->updateTokens('access-token', 'refresh-token', new \DateTimeImmutable('+1 hour'));
        $em->persist($user);
        $em->flush();

        $this->client->loginUser($user);
    }

    public function testMeReturnsCurrentUser(): void
    {
        $this->client->request('GET', '/api/me');

        self::assertResponseIsSuccessful();
        self::assertJsonStringEqualsJsonString(
            '{"id":"spotify-user-1","displayName":"Jane Doe","avatarUrl":"https://i.scdn.co/image/avatar"}',
            (string) $this->client->getResponse()->getContent(),
        );
    }

    public function testTopTracksCallsSpotifyWithUserToken(): void
    {
        $mock = new MockHttpClient(static function (string $method, string $url, array $options): JsonMockResponse {
            self::assertSame('GET', $method);
            self::assertStringStartsWith('https://api.spotify.com/v1/me/top/tracks?time_range=short_term&limit=10', $url);
            self::assertContains('Authorization: Bearer access-token', $options['headers']);

            return new JsonMockResponse(['items' => [[
                'id' => 'track-1',
                'uri' => 'spotify:track:track-1',
                'name' => 'Song',
                'artists' => [['name' => 'Artist A'], ['name' => 'Artist B']],
                'album' => ['name' => 'Album', 'images' => [['url' => 'https://i.scdn.co/image/cover']]],
                'duration_ms' => 200000,
                'external_ids' => ['isrc' => 'FRXXX2600001'],
            ]]]);
        }, 'https://api.spotify.com/v1/');
        static::getContainer()->set('spotify.client', $mock);

        $this->client->request('GET', '/api/me/top/tracks?range=short_term&limit=10');

        self::assertResponseIsSuccessful();
        $tracks = json_decode((string) $this->client->getResponse()->getContent(), true);
        self::assertSame('Song', $tracks[0]['name']);
        self::assertSame(['Artist A', 'Artist B'], $tracks[0]['artists']);
        self::assertSame('FRXXX2600001', $tracks[0]['isrc']);
    }

    public function testTopTracksRejectsInvalidRange(): void
    {
        $this->client->request('GET', '/api/me/top/tracks?range=forever');

        self::assertResponseStatusCodeSame(404);
    }
}
