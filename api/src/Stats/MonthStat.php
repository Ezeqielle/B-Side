<?php

namespace App\Stats;

final readonly class MonthStat
{
    public function __construct(
        /** Au format 2021-03. */
        public string $month,
        public int $plays,
        public int $msPlayed,
    ) {
    }
}
