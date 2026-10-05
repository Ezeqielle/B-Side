<?php

namespace App\Tests\Controller;

use GuzzleHttp\Client;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Psr7\Response;
use KnpU\OAuth2ClientBundle\Client\OAuth2ClientInterface;
use League\OAuth2\Client\Provider\AbstractProvider;

/**
 * Pour les tests de connexion à Spotify (WebTestCase).
 */
trait SpotifyOAuthMock
{
    /**
     * Simule Spotify derrière un client OAuth : le token, puis le profil de `$spotifyId`.
     */
    private function mockSpotifyOAuth(string $client, string $spotifyId, string $displayName, int $profileStatus = 200): void
    {
        /** @var OAuth2ClientInterface $oauth */
        $oauth = static::getContainer()->get('knpu.oauth2.client.' . $client);
        /** @var AbstractProvider $provider */
        $provider = $oauth->getOAuth2Provider();
        $provider->setHttpClient(new Client(['handler' => HandlerStack::create(new MockHandler([
            new Response(200, ['Content-Type' => 'application/json'], (string) json_encode([
                'access_token' => $spotifyId . '-access-token',
                'refresh_token' => $spotifyId . '-refresh-token',
                'expires_in' => 3600,
            ])),
            new Response($profileStatus, ['Content-Type' => 'application/json'], (string) json_encode(200 === $profileStatus
                ? ['id' => $spotifyId, 'display_name' => $displayName, 'images' => []]
                : ['error' => ['status' => $profileStatus, 'message' => 'Forbidden']])),
        ]))]));
    }
}
