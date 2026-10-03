<?php

namespace App\Playlist;

use App\Entity\Removal;

/**
 * Ligne du journal des retraits.
 */
final readonly class RemovedTrack
{
    public function __construct(
        public int $id,
        public string $trackId,
        public string $name,
        public string $artistName,
        public string $albumName,
        public ?string $imageUrl,
        public string $playlistId,
        public string $playlistName,
        public int $position,
        public ?\DateTimeImmutable $addedAt,
        public \DateTimeImmutable $removedAt,
        public ?\DateTimeImmutable $restoredAt,
    ) {
    }

    public static function of(Removal $removal): self
    {
        $track = $removal->getTrack();

        return new self(
            id: $removal->getId() ?? throw new \LogicException('Removal not persisted.'),
            trackId: $track->getId(),
            name: $track->getName(),
            artistName: $track->getArtistName(),
            albumName: $track->getAlbumName(),
            imageUrl: $track->getImageUrl(),
            playlistId: $removal->getPlaylistId(),
            playlistName: $removal->getPlaylistName(),
            position: $removal->getPosition(),
            addedAt: $removal->getAddedAt(),
            removedAt: $removal->getRemovedAt(),
            restoredAt: $removal->getRestoredAt(),
        );
    }
}
