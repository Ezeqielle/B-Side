<?php

namespace App\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * Titre d'une playlist, à sa position. Un même titre peut y figurer plusieurs fois.
 */
#[ORM\Entity]
class PlaylistTrack
{
    public function __construct(
        #[ORM\Id]
        #[ORM\ManyToOne]
        #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
        private readonly Playlist $playlist,
        #[ORM\Id]
        #[ORM\Column]
        private readonly int $position,
        #[ORM\ManyToOne]
        #[ORM\JoinColumn(nullable: false)]
        private readonly Track $track,
        /** Inconnu pour les playlists très anciennes. */
        #[ORM\Column(type: Types::DATETIMETZ_IMMUTABLE, nullable: true)]
        private readonly ?\DateTimeImmutable $addedAt,
    ) {
    }

    public function getPlaylist(): Playlist
    {
        return $this->playlist;
    }

    public function getPosition(): int
    {
        return $this->position;
    }

    public function getTrack(): Track
    {
        return $this->track;
    }

    public function getAddedAt(): ?\DateTimeImmutable
    {
        return $this->addedAt;
    }
}
