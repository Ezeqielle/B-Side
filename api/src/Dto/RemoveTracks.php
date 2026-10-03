<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

final readonly class RemoveTracks
{
    /**
     * @param list<int> $positions titres à retirer de la playlist
     */
    public function __construct(
        #[Assert\Count(min: 1, max: 10000)]
        #[Assert\All(new Assert\PositiveOrZero())]
        public array $positions,
    ) {
    }
}
