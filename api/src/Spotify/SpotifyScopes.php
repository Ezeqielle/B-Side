<?php

namespace App\Spotify;

/**
 * Scopes OAuth demandés à la connexion.
 *
 * @see https://developer.spotify.com/documentation/web-api/concepts/scopes
 */
final class SpotifyScopes
{
    public const array ALL = [
        'user-top-read',
        'user-read-recently-played',
        'user-library-read',
        'user-library-modify',
        'playlist-read-private',
        'playlist-read-collaborative',
        'playlist-modify-private',
        'playlist-modify-public',
    ];
}
