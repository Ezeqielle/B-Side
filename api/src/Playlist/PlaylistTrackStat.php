<?php

namespace App\Playlist;

final readonly class PlaylistTrackStat
{
    public function __construct(
        public int $position,
        public string $id,
        public string $name,
        public string $artistName,
        public string $albumName,
        public ?int $durationMs,
        public ?string $imageUrl,
        public ?\DateTimeImmutable $addedAt,
        public int $plays,
        /** Toutes ses écoutes, même courtes : la base de `skipRate`. */
        public int $starts,
        public float $skipRate,
        public ?\DateTimeImmutable $lastPlayedAt,
    ) {
    }
}
