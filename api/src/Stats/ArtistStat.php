<?php

namespace App\Stats;

final readonly class ArtistStat
{
    public function __construct(
        public string $name,
        public int $plays,
        public int $msPlayed,
        public int $tracks,
    ) {
    }
}
