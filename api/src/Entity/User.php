<?php

namespace App\Entity;

use App\Repository\UserRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Security\Core\User\UserInterface;

#[ORM\Entity(repositoryClass: UserRepository::class)]
#[ORM\Table(name: '`user`')]
class User implements UserInterface
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private ?string $displayName = null;

    #[ORM\Column(length: 1024, nullable: true)]
    private ?string $avatarUrl = null;

    #[ORM\Column(type: Types::TEXT)]
    private string $accessToken = '';

    #[ORM\Column(type: Types::TEXT)]
    private string $refreshToken = '';

    #[ORM\Column]
    private \DateTimeImmutable $tokenExpiresAt;

    #[ORM\Column]
    private readonly \DateTimeImmutable $createdAt;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $playlistsSyncedAt = null;

    /** Playlist Spotify où vont les titres retirés, créée au premier retrait. */
    #[ORM\Column(length: 64, nullable: true)]
    private ?string $trashPlaylistId = null;

    /**
     * Autres comptes Spotify de la même personne, liés en s'y connectant : on peut y copier ses playlists.
     * Le lien est enregistré dans les deux sens.
     *
     * @var Collection<int, self>
     */
    #[ORM\ManyToMany(targetEntity: self::class)]
    #[ORM\JoinTable(name: 'linked_account')]
    #[ORM\JoinColumn(name: 'user_id', onDelete: 'CASCADE')]
    #[ORM\InverseJoinColumn(name: 'linked_user_id', onDelete: 'CASCADE')]
    private Collection $linkedAccounts;

    public function __construct(
        #[ORM\Column(length: 255, unique: true)]
        private readonly string $spotifyId,
    ) {
        $this->tokenExpiresAt = new \DateTimeImmutable();
        $this->createdAt = new \DateTimeImmutable();
        $this->linkedAccounts = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getSpotifyId(): string
    {
        return $this->spotifyId;
    }

    public function getDisplayName(): ?string
    {
        return $this->displayName;
    }

    public function setDisplayName(string $displayName): static
    {
        $this->displayName = $displayName;

        return $this;
    }

    public function getAvatarUrl(): ?string
    {
        return $this->avatarUrl;
    }

    public function setAvatarUrl(?string $avatarUrl): static
    {
        $this->avatarUrl = $avatarUrl;

        return $this;
    }

    public function getAccessToken(): string
    {
        return $this->accessToken;
    }

    public function getRefreshToken(): string
    {
        return $this->refreshToken;
    }

    public function getTokenExpiresAt(): \DateTimeImmutable
    {
        return $this->tokenExpiresAt;
    }

    /**
     * Spotify ne renvoie pas toujours un nouveau refresh token : on garde l'ancien dans ce cas.
     */
    public function updateTokens(string $accessToken, ?string $refreshToken, \DateTimeImmutable $expiresAt): static
    {
        $this->accessToken = $accessToken;
        $this->refreshToken = $refreshToken ?? $this->refreshToken;
        $this->tokenExpiresAt = $expiresAt;

        return $this;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getPlaylistsSyncedAt(): ?\DateTimeImmutable
    {
        return $this->playlistsSyncedAt;
    }

    public function setPlaylistsSyncedAt(\DateTimeImmutable $playlistsSyncedAt): static
    {
        $this->playlistsSyncedAt = $playlistsSyncedAt;

        return $this;
    }

    public function getTrashPlaylistId(): ?string
    {
        return $this->trashPlaylistId;
    }

    /**
     * null quand la corbeille a disparu de la bibliothèque : une autre sera créée au prochain retrait.
     */
    public function setTrashPlaylistId(?string $trashPlaylistId): static
    {
        $this->trashPlaylistId = $trashPlaylistId;

        return $this;
    }

    /**
     * @return list<self>
     */
    public function getLinkedAccounts(): array
    {
        return array_values($this->linkedAccounts->toArray());
    }

    public function findLinkedAccount(string $spotifyId): ?self
    {
        return $this->linkedAccounts->findFirst(static fn (int $key, self $account): bool => $account->spotifyId === $spotifyId);
    }

    public function link(self $account): static
    {
        if ($account === $this) {
            throw new \LogicException('An account cannot be linked to itself.');
        }
        if (!$this->linkedAccounts->contains($account)) {
            $this->linkedAccounts->add($account);
            $account->linkedAccounts->add($this);
        }

        return $this;
    }

    public function unlink(self $account): static
    {
        $this->linkedAccounts->removeElement($account);
        $account->linkedAccounts->removeElement($this);

        return $this;
    }

    public function getUserIdentifier(): string
    {
        return $this->spotifyId ?: throw new \LogicException('User without Spotify id.');
    }

    public function getRoles(): array
    {
        return ['ROLE_USER'];
    }
}
