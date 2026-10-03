<?php

namespace App\Entity;

use App\Repository\TrackRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * Titre Spotify, partagé entre utilisateurs. L'identifiant est celui de Spotify.
 */
#[ORM\Entity(repositoryClass: TrackRepository::class)]
class Track
{
    public function __construct(
        #[ORM\Id]
        #[ORM\Column(length: 22)]
        private readonly string $id,
        #[ORM\Column(type: Types::TEXT)]
        private readonly string $name,
        #[ORM\Column(type: Types::TEXT)]
        private readonly string $artistName,
        #[ORM\Column(type: Types::TEXT)]
        private readonly string $albumName,
    ) {
    }

    public function getId(): string
    {
        return $this->id;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function getArtistName(): string
    {
        return $this->artistName;
    }

    public function getAlbumName(): string
    {
        return $this->albumName;
    }
}
