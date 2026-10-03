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
        public ?\DateTimeImmutable $addedAt,
        public int $plays,
        public float $skipRate,
        public ?\DateTimeImmutable $lastPlayedAt,
        public ?Cleanup $cleanup,
    ) {
    }
}
