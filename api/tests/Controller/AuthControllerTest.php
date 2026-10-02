<?php

namespace App\Tests\Controller;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class AuthControllerTest extends WebTestCase
{
    public function testLoginRedirectsToSpotifyWithScopes(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/auth/login');

        self::assertResponseRedirects();
        $location = (string) $client->getResponse()->headers->get('Location');
        self::assertStringStartsWith('https://accounts.spotify.com/authorize', $location);
        self::assertStringContainsString('client_id=test-client-id', $location);
        self::assertStringContainsString('scope=user-top-read%20user-read-recently-played', $location);
        self::assertStringContainsString(urlencode('/api/auth/callback'), $location);
    }

    public function testApiRequiresAuthentication(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/me');

        self::assertResponseStatusCodeSame(401);
        self::assertJsonStringEqualsJsonString('{"error":"unauthenticated"}', (string) $client->getResponse()->getContent());
    }
}
