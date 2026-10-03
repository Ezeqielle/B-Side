<?php

namespace App\Playlist;

final readonly class PlaylistStat
{
    public function __construct(
        /** Id Spotify. */
        public string $id,
        public string $name,
        public string $ownerName,
        public ?string $imageUrl,
        public int $tracks,
        public int $artists,
        public int $durationMs,
        public int $neverPlayed,
        /** Part des écoutes de ses titres qui ont été passées, où qu'elles aient eu lieu. */
        public float $skipRate,
        public ?\DateTimeImmutable $lastPlayedAt,
        public ?\DateTimeImmutable $lastAddedAt,
    ) {
    }
}
