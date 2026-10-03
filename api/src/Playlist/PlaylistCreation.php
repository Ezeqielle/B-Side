<?php

namespace App\Playlist;

use App\Entity\User;
use App\Message\SyncPlaylists;
use App\Spotify\SpotifyApi;
use App\Stats\StatsCache;
use Symfony\Component\Messenger\MessageBusInterface;

/**
 * Crée une playlist privée sur Spotify avec des titres, puis lance une synchro pour qu'elle apparaisse dans l'app.
 */
class PlaylistCreation
{
    public const string DESCRIPTION = 'Créée par Spotylist.';

    public function __construct(
        private readonly SpotifyApi $spotify,
        private readonly StatsCache $statsCache,
        private readonly MessageBusInterface $bus,
    ) {
    }

    /**
     * @param list<string> $trackIds
     *
     * @return string id Spotify de la playlist
     */
    public function create(User $user, string $name, array $trackIds): string
    {
        $id = $this->spotify->createPlaylist($user, $name, self::DESCRIPTION);
        $this->spotify->addToPlaylist($user, $id, $trackIds);

        $userId = $user->getId() ?? throw new \LogicException('User not persisted.');
        $this->statsCache->clear($userId);
        $this->bus->dispatch(new SyncPlaylists($userId));

        return $id;
    }
}
