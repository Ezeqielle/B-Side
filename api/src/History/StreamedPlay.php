<?php

namespace App\History;

/**
 * Une écoute lue dans l'historique, avant enregistrement.
 */
final readonly class StreamedPlay
{
    public function __construct(
        public string $trackId,
        public string $trackName,
        public string $artistName,
        public string $albumName,
        public \DateTimeImmutable $playedAt,
        public int $msPlayed,
        public bool $skipped,
        public string $reasonStart,
        public string $reasonEnd,
    ) {
    }
}
