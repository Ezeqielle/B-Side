<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

/**
 * Titre vu à une position de sa playlist : il n'est retiré que s'il y est encore.
 */
final readonly class TrackPosition
{
    public function __construct(
        #[Assert\PositiveOrZero]
        public int $position,
        /** Id Spotify du titre. */
        #[Assert\NotBlank]
        public string $id,
    ) {
    }

    /**
     * @param list<self> $tracks
     *
     * @return array<int, string> id Spotify des titres, par position
     */
    public static function byPosition(array $tracks): array
    {
        return array_column($tracks, 'id', 'position');
    }
}
