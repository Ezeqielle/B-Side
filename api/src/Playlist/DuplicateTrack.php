<?php

namespace App\Playlist;

/**
 * Titre présent plusieurs fois dans les playlists de l'utilisateur.
 */
final readonly class DuplicateTrack
{
    /**
     * @param list<string> $playlists noms des playlists, répétés si le titre y est en double
     */
    public function __construct(
        public string $id,
        public string $name,
        public string $artistName,
        public array $playlists,
    ) {
    }
}
