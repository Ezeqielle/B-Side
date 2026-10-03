<?php

namespace App\History;

/**
 * État de l'historique importé d'un utilisateur.
 */
final readonly class HistorySummary
{
    public function __construct(
        public int $plays,
        public int $tracks,
        public ?\DateTimeImmutable $firstPlayedAt,
        public ?\DateTimeImmutable $lastPlayedAt,
    ) {
    }
}
