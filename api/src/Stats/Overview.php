<?php

namespace App\Stats;

final readonly class Overview
{
    public function __construct(
        public int $plays,
        public int $msPlayed,
        public int $tracks,
        public int $artists,
        public float $skipRate,
    ) {
    }
}
