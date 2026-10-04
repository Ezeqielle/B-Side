<?php

namespace App\Playlist;

final readonly class RemovalResult
{
    public function __construct(
        public int $removed,
        /** Titres qui n'étaient plus à la position vue : laissés en place. */
        public int $skipped,
    ) {
    }
}
