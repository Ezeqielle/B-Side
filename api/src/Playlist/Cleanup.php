<?php

namespace App\Playlist;

/**
 * Raison de retirer un titre d'une playlist : la même règle sert à l'écran et servira à la suppression.
 */
enum Cleanup: string
{
    case NeverPlayed = 'never_played';
    case OftenSkipped = 'often_skipped';

    /** À partir de là, un titre écouté est « souvent passé ». */
    public const float OFTEN_SKIPPED = 0.5;

    /**
     * @param int   $plays    écoutes qui comptent (Listening::COUNTS)
     * @param float $skipRate part de toutes ses écoutes qui ont été passées
     */
    public static function of(int $plays, float $skipRate): ?self
    {
        return match (true) {
            0 === $plays => self::NeverPlayed,
            $skipRate >= self::OFTEN_SKIPPED => self::OftenSkipped,
            default => null,
        };
    }
}
