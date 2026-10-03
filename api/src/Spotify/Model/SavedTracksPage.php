<?php

namespace App\Spotify\Model;

/**
 * Page de titres likés, du plus récent au plus ancien.
 */
final readonly class SavedTracksPage
{
    /**
     * @param list<PlaylistItem> $items
     */
    public function __construct(
        public array $items,
        public int $total,
        public bool $hasNext,
    ) {
    }

    /**
     * @param array<string, mixed> $data réponse de GET /me/tracks
     */
    public static function fromApi(array $data): self
    {
        return new self(
            items: PlaylistItem::listFromApi($data['items']),
            total: $data['total'],
            hasNext: null !== $data['next'],
        );
    }

    /**
     * Les likes n'ont pas de snapshot_id comme une playlist : leur première page en tient lieu.
     * Un like ajouté la change, un like retiré change le total.
     */
    public function snapshotId(): string
    {
        $ids = array_map(static fn (PlaylistItem $item): string => $item->track->id, $this->items);

        return hash('xxh128', $this->total . ':' . implode(',', $ids));
    }
}
