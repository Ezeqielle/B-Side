<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

final readonly class KeepTracks
{
    /**
     * @param list<string> $trackIds ids Spotify
     * @param bool         $kept     à garder, ou à rendre au nettoyage
     */
    public function __construct(
        #[Assert\Count(min: 1, max: 10000)]
        #[Assert\All(new Assert\Length(min: 1, max: 22))]
        public array $trackIds,
        public bool $kept = true,
    ) {
    }
}
