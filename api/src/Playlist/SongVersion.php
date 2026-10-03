<?php

namespace App\Playlist;

/**
 * Version d'un morceau dans une playlist (voir SongVersions).
 */
final readonly class SongVersion
{
    public function __construct(
        public PlaylistTrackStat $track,
        /** Position du premier titre du même enregistrement : égale pour deux versions identiques. */
        public int $recording,
    ) {
    }
}
