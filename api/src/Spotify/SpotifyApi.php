<?php

namespace App\Spotify;

use App\Entity\User;
use App\Spotify\Model\Artist;
use App\Spotify\Model\Playlist;
use App\Spotify\Model\PlaylistItem;
use App\Spotify\Model\SavedTracksPage;
use App\Spotify\Model\Track;
use Symfony\Component\DependencyInjection\Attribute\Target;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Appels à l'API Web Spotify au nom d'un utilisateur.
 */
class SpotifyApi
{
    private const int PAGE_SIZE = 50;

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
     * Playlists de la bibliothèque : créées, collaboratives ou suivies.
     *
     * @return list<Playlist>
     */
    public function getPlaylists(User $user): array
    {
        return array_map(Playlist::fromApi(...), $this->getAllPages($user, 'me/playlists'));
    }

    /**
     * Contenu d'une playlist, dans l'ordre. Spotify ne le donne que si l'utilisateur en est propriétaire ou collaborateur.
     *
     * @return list<PlaylistItem>
     */
    public function getPlaylistItems(User $user, string $playlistId): array
    {
        return PlaylistItem::listFromApi($this->getAllPages($user, 'playlists/' . rawurlencode($playlistId) . '/items'));
    }

    /**
     * Première page des titres likés : les 50 plus récents, et leur nombre.
     */
    public function getSavedTracksPage(User $user): SavedTracksPage
    {
        return SavedTracksPage::fromApi($this->get($user, 'me/tracks', ['limit' => self::PAGE_SIZE]));
    }

    /**
     * Tous les titres likés, du plus récent au plus ancien, en reprenant après leur première page.
     *
     * @return list<PlaylistItem>
     */
    public function getSavedTracks(User $user, SavedTracksPage $first): array
    {
        if (!$first->hasNext) {
            return $first->items;
        }

        return [...$first->items, ...PlaylistItem::listFromApi($this->getAllPages($user, 'me/tracks', self::PAGE_SIZE))];
    }

    /**
     * Parcourt une liste paginée à partir de `$offset`, 50 éléments par requête (le maximum).
     *
     * @return list<array<string, mixed>>
     */
    private function getAllPages(User $user, string $path, int $offset = 0): array
    {
        $items = [];
        do {
            $page = $this->get($user, $path, ['limit' => self::PAGE_SIZE, 'offset' => $offset + \count($items)]);
            array_push($items, ...$page['items']);
        } while (null !== $page['next'] && [] !== $page['items']);

        return $items;
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
