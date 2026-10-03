<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

final readonly class CreatePlaylist
{
    /**
     * @param list<string> $trackIds ids Spotify, dans l'ordre de la playlist
     */
    public function __construct(
        #[Assert\NotBlank(normalizer: 'trim')]
        #[Assert\Length(max: 100)]
        public string $name,
        #[Assert\Count(min: 1, max: 10000)]
        #[Assert\All(new Assert\Length(min: 1, max: 22))]
        public array $trackIds,
    ) {
    }
}
