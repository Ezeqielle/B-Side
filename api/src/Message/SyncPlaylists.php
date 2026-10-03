<?php

namespace App\Message;

/**
 * Synchronisation des playlists d'un utilisateur avec Spotify.
 */
final readonly class SyncPlaylists
{
    public function __construct(
        public int $userId,
    ) {
    }
}
