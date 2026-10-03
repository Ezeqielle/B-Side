<?php

namespace App\Entity;

use App\Repository\PlayRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * Une écoute d'un titre par un utilisateur.
 */
#[ORM\Entity(repositoryClass: PlayRepository::class)]
#[ORM\UniqueConstraint(columns: ['user_id', 'played_at', 'track_id'])]
class Play
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    public function __construct(
        #[ORM\ManyToOne]
        #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
        private readonly User $user,
        #[ORM\ManyToOne]
        #[ORM\JoinColumn(nullable: false)]
        private readonly Track $track,
        /** Fin de l'écoute. */
        #[ORM\Column(type: Types::DATETIMETZ_IMMUTABLE)]
        private readonly \DateTimeImmutable $playedAt,
        #[ORM\Column]
        private readonly int $msPlayed,
        #[ORM\Column]
        private readonly bool $skipped,
        #[ORM\Column(length: 32)]
        private readonly string $reasonStart,
        #[ORM\Column(length: 32)]
        private readonly string $reasonEnd,
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

    public function getPlayedAt(): \DateTimeImmutable
    {
        return $this->playedAt;
    }

    public function getMsPlayed(): int
    {
        return $this->msPlayed;
    }

    public function isSkipped(): bool
    {
        return $this->skipped;
    }

    public function getReasonStart(): string
    {
        return $this->reasonStart;
    }

    public function getReasonEnd(): string
    {
        return $this->reasonEnd;
    }
}
