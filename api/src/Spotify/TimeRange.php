<?php

namespace App\Spotify;

/**
 * Périodes des tops Spotify : ~4 semaines, ~6 mois, ~1 an.
 */
enum TimeRange: string
{
    case ShortTerm = 'short_term';
    case MediumTerm = 'medium_term';
    case LongTerm = 'long_term';
}
