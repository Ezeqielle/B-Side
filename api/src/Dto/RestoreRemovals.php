<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

final readonly class RestoreRemovals
{
    /**
     * @param list<int> $ids retraits à annuler
     */
    public function __construct(
        #[Assert\Count(min: 1, max: 10000)]
        #[Assert\All(new Assert\Positive())]
        public array $ids,
    ) {
    }
}
