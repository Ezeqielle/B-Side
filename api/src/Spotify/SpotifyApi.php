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
use Symfony\Contracts\HttpClient\ResponseInterface;

/**
 * Appels à l'API Web Spotify au nom d'un utilisateur.
 */
class SpotifyApi
{
    private const int PAGE_SIZE = 50;

    /** Titres ajoutés ou retirés d'une playlist par requête, au plus. */
    private const int PLAYLIST_BATCH = 100;

    /** Titres likés ou retirés des likes par requête, au plus. */
    private const int LIBRARY_BATCH = 40;

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
     * Crée une playlist privée.
     *
     * @return string son id
     */
    public function createPlaylist(User $user, string $name, string $description): string
    {
        return $this->send($user, 'POST', 'me/playlists', ['json' => [
            'name' => $name,
            'description' => $description,
            'public' => false,
        ]])->toArray()['id'];
    }

    /**
     * Ajoute des titres à une playlist, à la fin ou à partir de `$position`.
     *
     * @param list<string> $trackIds
     */
    public function addToPlaylist(User $user, string $playlistId, array $trackIds, ?int $position = null): void
    {
        foreach (array_chunk($trackIds, self::PLAYLIST_BATCH) as $i => $ids) {
            $this->send($user, 'POST', self::playlistItems($playlistId), ['json' => array_filter([
                'uris' => self::uris($ids),
                'position' => null !== $position ? $position + $i * self::PLAYLIST_BATCH : null,
            ], static fn (mixed $value): bool => null !== $value)]);
        }
    }

    /**
     * Retire des titres d'une playlist : toutes leurs occurrences, Spotify ne permet pas d'en viser une.
     *
     * @param list<string> $trackIds
     */
    public function removeFromPlaylist(User $user, string $playlistId, array $trackIds): void
    {
        foreach (array_chunk($trackIds, self::PLAYLIST_BATCH) as $ids) {
            $this->send($user, 'DELETE', self::playlistItems($playlistId), ['json' => [
                'items' => array_map(static fn (string $uri): array => ['uri' => $uri], self::uris($ids)),
            ]]);
        }
    }

    /**
     * Like des titres.
     *
     * @param list<string> $trackIds
     */
    public function saveTracks(User $user, array $trackIds): void
    {
        foreach (array_chunk($trackIds, self::LIBRARY_BATCH) as $ids) {
            $this->send($user, 'PUT', 'me/library', ['query' => ['uris' => implode(',', self::uris($ids))]]);
        }
    }

    /**
     * Retire des titres des likes.
     *
     * @param list<string> $trackIds
     */
    public function removeSavedTracks(User $user, array $trackIds): void
    {
        foreach (array_chunk($trackIds, self::LIBRARY_BATCH) as $ids) {
            $this->send($user, 'DELETE', 'me/library', ['query' => ['uris' => implode(',', self::uris($ids))]]);
        }
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
        return $this->send($user, 'GET', $path, ['query' => $query])->toArray();
    }

    /**
     * @param array<string, mixed> $options
     */
    private function send(User $user, string $method, string $path, array $options = []): ResponseInterface
    {
        $response = $this->spotifyClient->request($method, $path, [
            'auth_bearer' => $this->tokenRefresher->getValidAccessToken($user),
            ...$options,
        ]);
        // Lève une exception si Spotify refuse, même quand la réponse n'est pas lue
        $response->getHeaders();

        return $response;
    }

    private static function playlistItems(string $playlistId): string
    {
        return 'playlists/' . rawurlencode($playlistId) . '/items';
    }

    /**
     * @param list<string> $trackIds
     *
     * @return list<string>
     */
    private static function uris(array $trackIds): array
    {
        return array_map(static fn (string $id): string => 'spotify:track:' . $id, $trackIds);
    }
}
