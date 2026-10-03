<?php

namespace App\Spotify;

use App\Entity\User;
use App\Spotify\Model\Artist;
use App\Spotify\Model\Track;
use Symfony\Component\DependencyInjection\Attribute\Target;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Appels à l'API Web Spotify au nom d'un utilisateur.
 */
class SpotifyApi
{
    public function __construct(
        #[Target('spotify.client')]
        private readonly HttpClientInterface $spotifyClient,
        private readonly SpotifyTokenRefresher $tokenRefresher,
    ) {
    }

    /**
     * @return list<Track>
     */
    public function getTopTracks(User $user, TimeRange $range, int $limit = 50): array
    {
        $data = $this->get($user, 'me/top/tracks', [
            'time_range' => $range->value,
            'limit' => $limit,
        ]);

        return array_values(array_map(Track::fromApi(...), $data['items']));
    }

    public function getTrack(User $user, string $id): Track
    {
        return Track::fromApi($this->get($user, 'tracks/' . rawurlencode($id)));
    }

    public function getArtist(User $user, string $id): Artist
    {
        return Artist::fromApi($this->get($user, 'artists/' . rawurlencode($id)));
    }

    /**
     * @param array<string, scalar> $query
     *
     * @return array<string, mixed>
     */
    private function get(User $user, string $path, array $query = []): array
    {
        return $this->spotifyClient->request('GET', $path, [
            'auth_bearer' => $this->tokenRefresher->getValidAccessToken($user),
            'query' => $query,
        ])->toArray();
    }
}
