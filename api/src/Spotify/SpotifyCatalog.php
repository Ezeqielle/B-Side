<?php

namespace App\Spotify;

use App\Entity\User;
use App\Spotify\Model\Artist;
use App\Spotify\Model\Track;
use Symfony\Contracts\Cache\CacheInterface;
use Symfony\Contracts\Cache\ItemInterface;

/**
 * Titres et artistes Spotify par id, demandés une seule fois puis gardés en cache : l'API ne sert plus
 * qu'un élément par requête, sur un quota partagé. Pochettes, extraits et titres proches passent par ici.
 * Une erreur de Spotify n'est pas gardée : la requête sera retentée.
 */
class SpotifyCatalog
{
    private const int TTL = 30 * 86400;

    public function __construct(
        private readonly SpotifyApi $spotify,
        private readonly CacheInterface $cache,
    ) {
    }

    public function track(User $user, string $id): Track
    {
        return $this->cache->get('spotify.track.' . $id, function (ItemInterface $item) use ($user, $id): Track {
            $item->expiresAfter(self::TTL);

            return $this->spotify->getTrack($user, $id);
        });
    }

    public function artist(User $user, string $id): Artist
    {
        return $this->cache->get('spotify.artist.' . $id, function (ItemInterface $item) use ($user, $id): Artist {
            $item->expiresAfter(self::TTL);

            return $this->spotify->getArtist($user, $id);
        });
    }
}
