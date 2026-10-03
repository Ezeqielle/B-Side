<?php

namespace App\Stats;

use App\Entity\User;
use App\Spotify\SpotifyApi;
use Doctrine\DBAL\Connection;
use Symfony\Contracts\Cache\CacheInterface;
use Symfony\Contracts\Cache\ItemInterface;

/**
 * Images des titres et artistes, demandées une seule fois à Spotify puis gardées en cache :
 * l'API ne sert plus qu'un élément par requête, sur un quota partagé.
 */
class Artwork
{
    private const int TTL = 30 * 86400;

    public function __construct(
        private readonly SpotifyApi $spotify,
        private readonly CacheInterface $cache,
        private readonly Connection $connection,
    ) {
    }

    /**
     * Pochette de l'album du titre.
     */
    public function forTrack(User $user, string $trackId): ?string
    {
        return $this->cache->get('artwork.track.' . $trackId, function (ItemInterface $item) use ($user, $trackId): ?string {
            $item->expiresAfter(self::TTL);

            return $this->spotify->getTrack($user, $trackId)->imageUrl;
        });
    }

    /**
     * Photo de l'artiste. L'historique ne donne que son nom : son id Spotify vient de l'un de ses titres.
     */
    public function forArtist(User $user, string $name): ?string
    {
        return $this->cache->get('artwork.artist.' . hash('xxh128', $name), function (ItemInterface $item) use ($user, $name): ?string {
            $item->expiresAfter(self::TTL);

            $trackId = $this->connection->fetchOne('SELECT id FROM track WHERE artist_name = ? LIMIT 1', [$name]);
            if (!\is_string($trackId)) {
                return null;
            }

            $track = $this->spotify->getTrack($user, $trackId);
            $index = array_search(mb_strtolower($name), array_map(mb_strtolower(...), $track->artists), true);
            $artistId = $track->artistIds[false === $index ? 0 : $index] ?? null;

            return null === $artistId ? null : $this->spotify->getArtist($user, $artistId)->imageUrl;
        });
    }
}
