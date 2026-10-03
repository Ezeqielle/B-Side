<?php

namespace App\Dto;

use App\Spotify\TimeRange;
use Symfony\Component\Validator\Constraints as Assert;

final readonly class TopTracksQuery
{
    public function __construct(
        public TimeRange $range = TimeRange::MediumTerm,
        #[Assert\Range(min: 1, max: 50)]
        public int $limit = 50,
        #[Assert\PositiveOrZero]
        public int $offset = 0,
    ) {
    }
}
