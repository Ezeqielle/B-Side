<?php

namespace App\Stats;

final readonly class SongPlaylist
{
    public function __construct(
        /** Id Spotify. */
        public string $id,
        public string $name,
        public ?string $imageUrl,
    ) {
    }
}
