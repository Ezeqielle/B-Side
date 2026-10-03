<?php

namespace App\Stats;

use App\Entity\User;
use App\Spotify\SpotifyCatalog;
use Doctrine\DBAL\Connection;

/**
 * Images des titres et artistes, prises chez Spotify (SpotifyCatalog).
 */
class Artwork
{
    public function __construct(
        private readonly SpotifyCatalog $catalog,
        private readonly Connection $connection,
    ) {
    }

    /**
     * Pochette de l'album du titre, gardée avec lui : Spotify n'est appelé que pour un titre jamais vu dans une playlist.
     */
    public function forTrack(User $user, string $trackId): ?string
    {
        $imageUrl = $this->connection->fetchOne('SELECT image_url FROM track WHERE id = ?', [$trackId]);
        if (\is_string($imageUrl)) {
            return $imageUrl;
        }

        $imageUrl = $this->catalog->track($user, $trackId)->thumbnailUrl;
        if (null !== $imageUrl) {
            $this->connection->executeStatement('UPDATE track SET image_url = ? WHERE id = ?', [$imageUrl, $trackId]);
        }

        return $imageUrl;
    }

    /**
     * Photo de l'artiste. L'historique ne donne que son nom : son id Spotify vient de l'un de ses titres.
     */
    public function forArtist(User $user, string $name): ?string
    {
        $trackId = $this->connection->fetchOne('SELECT id FROM track WHERE artist_name = ? LIMIT 1', [$name]);
        if (!\is_string($trackId)) {
            return null;
        }

        $track = $this->catalog->track($user, $trackId);
        $index = array_search(mb_strtolower($name), array_map(mb_strtolower(...), $track->artists), true);
        $artistId = $track->artistIds[false === $index ? 0 : $index] ?? null;

        return null === $artistId ? null : $this->catalog->artist($user, $artistId)->imageUrl;
    }
}
