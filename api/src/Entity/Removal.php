<?php

namespace App\Entity;

use App\Repository\RemovalRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * Titre retiré d'une playlist ou des likes, et mis dans la corbeille : de quoi le remettre en place.
 * Les titres d'un même retrait partagent leur `removedAt`.
 */
#[ORM\Entity(repositoryClass: RemovalRepository::class)]
#[ORM\Index(columns: ['user_id', 'removed_at'])]
class Removal
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(type: Types::DATETIMETZ_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $restoredAt = null;

    public function __construct(
        #[ORM\ManyToOne]
        #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
        private readonly User $user,
        #[ORM\ManyToOne]
        #[ORM\JoinColumn(nullable: false)]
        private readonly Track $track,
        /** Id Spotify de la playlist, ou Playlist::LIKED. */
        #[ORM\Column(length: 64)]
        private readonly string $playlistId,
        /** Gardé au cas où la playlist disparaît. */
        #[ORM\Column(length: 255)]
        private readonly string $playlistName,
        #[ORM\Column]
        private readonly int $position,
        #[ORM\Column(type: Types::DATETIMETZ_IMMUTABLE, nullable: true)]
        private readonly ?\DateTimeImmutable $addedAt,
        #[ORM\Column(type: Types::DATETIMETZ_IMMUTABLE)]
        private readonly \DateTimeImmutable $removedAt,
    ) {
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getUser(): User
    {
        return $this->user;
    }

    public function getTrack(): Track
    {
        return $this->track;
    }

    public function getPlaylistId(): string
    {
        return $this->playlistId;
    }

    public function getPlaylistName(): string
    {
        return $this->playlistName;
    }

    public function getPosition(): int
    {
        return $this->position;
    }

    public function getAddedAt(): ?\DateTimeImmutable
    {
        return $this->addedAt;
    }

    public function getRemovedAt(): \DateTimeImmutable
    {
        return $this->removedAt;
    }

    public function getRestoredAt(): ?\DateTimeImmutable
    {
        return $this->restoredAt;
    }

    public function markRestored(\DateTimeImmutable $restoredAt): static
    {
        $this->restoredAt = $restoredAt;

        return $this;
    }
}
