<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

final readonly class RemoveFromPlaylists
{
    /**
     * @param list<RemovalTarget> $targets
     */
    public function __construct(
        #[Assert\Count(min: 1, max: 1000)]
        #[Assert\Valid]
        public array $targets,
    ) {
    }
}
