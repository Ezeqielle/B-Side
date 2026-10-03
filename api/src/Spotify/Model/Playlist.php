<?php

namespace App\Spotify\Model;

/**
 * Playlist de la bibliothèque de l'utilisateur, sans son contenu.
 */
final readonly class Playlist
{
    public function __construct(
        public string $id,
        public string $name,
        public string $ownerId,
        public string $ownerName,
        public bool $collaborative,
        public string $snapshotId,
        public ?string $imageUrl,
    ) {
    }

    /**
     * @param array<string, mixed> $data objet "playlist" simplifié de l'API Spotify
     */
    public static function fromApi(array $data): self
    {
        return new self(
            id: $data['id'],
            name: $data['name'],
            ownerId: $data['owner']['id'],
            ownerName: $data['owner']['display_name'] ?? $data['owner']['id'],
            collaborative: $data['collaborative'] ?? false,
            snapshotId: $data['snapshot_id'],
            imageUrl: $data['images'][0]['url'] ?? null,
        );
    }
}
