<?php

namespace App\Entity;

use App\Repository\KeptTrackRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * Titre à garder dans une playlist : le nettoyage le laisse décoché, quelles que soient les règles.
 */
#[ORM\Entity(repositoryClass: KeptTrackRepository::class)]
class KeptTrack
{
    public function __construct(
        #[ORM\Id]
        #[ORM\ManyToOne]
        #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
        private readonly Playlist $playlist,
        #[ORM\Id]
        #[ORM\ManyToOne]
        #[ORM\JoinColumn(nullable: false)]
        private readonly Track $track,
        #[ORM\Column(type: Types::DATETIMETZ_IMMUTABLE)]
        private readonly \DateTimeImmutable $keptAt,
    ) {
    }

    public function getPlaylist(): Playlist
    {
        return $this->playlist;
    }

    public function getTrack(): Track
    {
        return $this->track;
    }

    public function getKeptAt(): \DateTimeImmutable
    {
        return $this->keptAt;
    }
}
