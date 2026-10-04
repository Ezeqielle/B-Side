<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

final readonly class RemovalTarget
{
    /**
     * @param list<TrackPosition> $tracks titres à retirer de cette playlist
     */
    public function __construct(
        /** Id Spotify de la playlist, ou `Playlist::LIKED`. */
        #[Assert\NotBlank]
        public string $playlistId,
        #[Assert\Count(min: 1, max: 10000)]
        #[Assert\Valid]
        public array $tracks,
    ) {
    }
}
