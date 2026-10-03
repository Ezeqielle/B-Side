<?php

namespace App\Stats;

/**
 * Historique d'un morceau, toutes versions confondues, depuis la première écoute.
 */
final readonly class SongStat
{
    public function __construct(
        public string $name,
        public string $artistName,
        public int $plays,
        public int $msPlayed,
        public ?\DateTimeImmutable $firstPlayedAt,
        public ?\DateTimeImmutable $lastPlayedAt,
        /** Premier like, si le morceau est dans les titres likés. */
        public ?\DateTimeImmutable $likedAt,
        /** @var list<MonthStat> sans les mois vides */
        public array $months,
        /** Jour où il est le plus écouté, de 1 (lundi) à 7. */
        public ?int $topWeekday,
        /** Heure où il est le plus écouté, de 0 à 23. */
        public ?int $topHour,
        /** @var list<SongPlaylist> playlists qui le contiennent, hors titres likés */
        public array $playlists,
    ) {
    }
}
