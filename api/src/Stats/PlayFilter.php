<?php

namespace App\Stats;

use Symfony\Component\Validator\Constraints as Assert;

/**
 * Sélection d'écoutes : sert aux stats, et servira à créer des playlists.
 *
 * Les dates sont des jours, bornes incluses, dans le fuseau de l'utilisateur.
 */
final readonly class PlayFilter
{
    public function __construct(
        public ?\DateTimeImmutable $from = null,
        #[Assert\GreaterThanOrEqual(propertyPath: 'from')]
        public ?\DateTimeImmutable $to = null,
        #[Assert\Length(max: 255)]
        public ?string $artist = null,
        #[Assert\Timezone]
        public string $tz = 'UTC',
    ) {
    }
}
