<?php

namespace App\Playlist;

/**
 * Les titres sont comptés une fois, même s'ils sont dans plusieurs playlists.
 */
final readonly class PlaylistOverview
{
    public function __construct(
        public ?\DateTimeImmutable $syncedAt,
        public int $playlists,
        /** Playlists suivies dont Spotify ne donne pas le contenu. */
        public int $unreadable,
        public int $tracks,
        public int $neverPlayed,
        public int $duplicates,
    ) {
    }
}
