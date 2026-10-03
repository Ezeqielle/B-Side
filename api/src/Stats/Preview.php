<?php

namespace App\Stats;

use App\Deezer\DeezerApi;
use App\Deezer\DeezerTrack;
use App\Entity\User;
use App\Spotify\SpotifyApi;
use Symfony\Contracts\Cache\CacheInterface;
use Symfony\Contracts\Cache\ItemInterface;

/**
 * Extraits de 30 s, pris chez Deezer depuis que Spotify ne les donne plus.
 * Le titre est retrouvé par son ISRC, sinon par son nom et son artiste.
 */
class Preview
{
    /** Correspondance titre Spotify → titre Deezer, absence comprise : elle ne change pas. */
    private const int MATCH_TTL = 30 * 86400;

    /** L'URL d'extrait Deezer expire au bout d'environ 15 min. */
    private const int URL_TTL = 600;

    public function __construct(
        private readonly SpotifyApi $spotify,
        private readonly DeezerApi $deezer,
        private readonly CacheInterface $cache,
    ) {
    }

    /**
     * URL du MP3, ou null si Deezer n'a pas le titre.
     */
    public function forTrack(User $user, string $trackId): ?string
    {
        // Titre Deezer obtenu en cherchant la correspondance : il donne déjà l'URL, inutile de le redemander
        /** @var ?DeezerTrack $found */
        $found = null;
        $deezerId = $this->cache->get('preview.match.' . $trackId, function (ItemInterface $item) use ($user, $trackId, &$found): ?int {
            $item->expiresAfter(self::MATCH_TTL);

            $track = $this->spotify->getTrack($user, $trackId);
            $found = (null === $track->isrc ? null : $this->deezer->findTrackByIsrc($track->isrc))
                ?? $this->deezer->searchTrack($track->name, $track->artists);

            return $found?->id;
        });

        if (null === $deezerId) {
            return null;
        }

        return $this->cache->get('preview.url.' . $deezerId, function (ItemInterface $item) use ($deezerId, $found): ?string {
            $item->expiresAfter(self::URL_TTL);

            return ($found ?? $this->deezer->getTrack($deezerId))?->previewUrl;
        });
    }
}
