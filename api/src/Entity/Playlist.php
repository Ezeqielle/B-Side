<?php

namespace App\Entity;

use App\Repository\PlaylistRepository;
use App\Spotify\Model\Playlist as SpotifyPlaylist;
use Doctrine\ORM\Mapping as ORM;

/**
 * Playlist de la bibliothèque d'un utilisateur. Son contenu est dans playlist_track.
 */
#[ORM\Entity(repositoryClass: PlaylistRepository::class)]
#[ORM\UniqueConstraint(columns: ['user_id', 'spotify_id'])]
class Playlist
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private string $name = '';

    #[ORM\Column(length: 255)]
    private string $ownerName = '';

    #[ORM\Column(length: 1024, nullable: true)]
    private ?string $imageUrl = null;

    /** Faux pour les playlists suivies : Spotify n'en donne pas le contenu. */
    #[ORM\Column]
    private bool $readable = false;

    /** Dernière version examinée, null tant qu'elle ne l'a pas été. */
    #[ORM\Column(length: 255, nullable: true)]
    private ?string $snapshotId = null;

    public function __construct(
        #[ORM\ManyToOne]
        #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
        private readonly User $user,
        #[ORM\Column(length: 64)]
        private readonly string $spotifyId,
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

    public function getSpotifyId(): string
    {
        return $this->spotifyId;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function getOwnerName(): string
    {
        return $this->ownerName;
    }

    public function getImageUrl(): ?string
    {
        return $this->imageUrl;
    }

    public function isReadable(): bool
    {
        return $this->readable;
    }

    public function getSnapshotId(): ?string
    {
        return $this->snapshotId;
    }

    public function update(SpotifyPlaylist $playlist): static
    {
        $this->name = mb_substr($playlist->name, 0, 255);
        $this->ownerName = mb_substr($playlist->ownerName, 0, 255);
        $this->imageUrl = $playlist->imageUrl;

        return $this;
    }

    /**
     * Contenu enregistré dans cette version.
     */
    public function markSynced(string $snapshotId): static
    {
        $this->readable = true;
        $this->snapshotId = $snapshotId;

        return $this;
    }

    /**
     * Spotify ne donne pas le contenu de cette version : on ne redemandera que si elle change.
     */
    public function markUnreadable(string $snapshotId): static
    {
        $this->readable = false;
        $this->snapshotId = $snapshotId;

        return $this;
    }
}
