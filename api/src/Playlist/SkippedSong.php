<?php

namespace App\Playlist;

/**
 * Morceau passé au moins une fois et rangé dans une playlist ou liké, toutes versions confondues.
 */
final readonly class SkippedSong
{
    /**
     * @param list<array{id: string, name: string, positions: list<int>}> $playlists playlists lisibles qui le
     *                                                                               contiennent, likes compris, et ses positions dans chacune
     */
    public function __construct(
        /** Titre passé en dernier. */
        public string $id,
        public string $name,
        public string $artistName,
        public ?string $imageUrl,
        public \DateTimeImmutable $skippedAt,
        public int $skips,
        /** Toutes ses écoutes, même courtes. */
        public int $starts,
        public array $playlists,
    ) {
    }
}
