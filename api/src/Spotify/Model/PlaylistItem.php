<?php

namespace App\Spotify\Model;

/**
 * Titre d'une playlist, à sa position.
 */
final readonly class PlaylistItem
{
    public function __construct(
        public Track $track,
        public ?\DateTimeImmutable $addedAt,
    ) {
    }

    /**
     * Les fichiers locaux, podcasts et titres retirés du catalogue n'ont pas de titre Spotify : null.
     *
     * @param array<string, mixed> $data élément de GET /playlists/{id}/items
     */
    public static function fromApi(array $data): ?self
    {
        $item = $data['item'] ?? null;
        if (($data['is_local'] ?? false) || !\is_array($item) || 'track' !== ($item['type'] ?? null) || null === ($item['id'] ?? null)) {
            return null;
        }

        return new self(
            track: Track::fromApi($item),
            addedAt: isset($data['added_at']) ? new \DateTimeImmutable($data['added_at']) : null,
        );
    }
}
