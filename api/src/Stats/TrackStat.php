<?php

namespace App\Stats;

final readonly class TrackStat
{
    public function __construct(
        public string $id,
        public string $name,
        public string $artistName,
        public string $albumName,
        public int $plays,
        public int $msPlayed,
        public float $skipRate,
        public \DateTimeImmutable $lastPlayedAt,
    ) {
    }
}
