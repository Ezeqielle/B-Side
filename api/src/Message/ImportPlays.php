<?php

namespace App\Message;

use App\History\StreamedPlay;

/**
 * Lot d'écoutes à enregistrer pour un utilisateur.
 */
final readonly class ImportPlays
{
    /**
     * @param list<StreamedPlay> $plays
     */
    public function __construct(
        public int $userId,
        public array $plays,
    ) {
    }
}
