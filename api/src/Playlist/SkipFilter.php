<?php

namespace App\Playlist;

use Symfony\Component\Validator\Constraints as Assert;

/**
 * Seuils des morceaux passés, cumulables. Sans seuil, tout morceau passé au moins une fois est retenu.
 */
final readonly class SkipFilter
{
    public function __construct(
        /** Passé au moins N fois. */
        #[Assert\Positive]
        public ?int $minSkips = null,
        /** Passé au moins cette part de ses écoutes, en %. */
        #[Assert\Range(min: 1, max: 100)]
        public ?int $minRate = null,
    ) {
    }
}
