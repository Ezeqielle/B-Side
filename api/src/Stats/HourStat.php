<?php

namespace App\Stats;

final readonly class HourStat
{
    public function __construct(
        /** 1 = lundi, 7 = dimanche. */
        public int $weekday,
        public int $hour,
        public int $plays,
    ) {
    }
}
