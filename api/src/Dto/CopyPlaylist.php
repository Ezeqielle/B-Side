<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

final readonly class CopyPlaylist
{
    /**
     * @param string $accountId id Spotify d'un compte lié
     */
    public function __construct(
        #[Assert\NotBlank]
        public string $accountId,
        #[Assert\NotBlank(normalizer: 'trim')]
        #[Assert\Length(max: 100)]
        public string $name,
    ) {
    }
}
