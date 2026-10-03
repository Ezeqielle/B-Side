<?php

namespace App\Playlist;

use App\Entity\KeptTrack;

/**
 * Titre à garder d'une playlist.
 */
final readonly class KeptTrackStat
{
    public function __construct(
        public string $id,
        public string $name,
        public string $artistName,
        public ?string $imageUrl,
        public \DateTimeImmutable $keptAt,
    ) {
    }

    public static function of(KeptTrack $kept): self
    {
        $track = $kept->getTrack();

        return new self(
            id: $track->getId(),
            name: $track->getName(),
            artistName: $track->getArtistName(),
            imageUrl: $track->getImageUrl(),
            keptAt: $kept->getKeptAt(),
        );
    }
}
