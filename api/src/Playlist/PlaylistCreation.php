<?php

namespace App\Playlist;

use App\Entity\Playlist;
use App\Entity\User;
use App\Message\SyncPlaylists;
use App\Repository\PlaylistRepository;
use App\Spotify\SpotifyApi;
use Symfony\Component\Messenger\MessageBusInterface;

/**
 * Crée une playlist privée sur Spotify avec des titres, ou en copie une, puis lance une synchro pour qu'elle apparaisse dans l'app.
 */
class PlaylistCreation
{
    public const string DESCRIPTION = 'Créée par B-Side.';

    public function __construct(
        private readonly SpotifyApi $spotify,
        private readonly PlaylistRepository $playlistRepository,
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
        $this->spotify->addTracks($user, $id, $trackIds);

        // Rien ne change en base avant la synchro, qui vide elle-même le cache des stats
        $this->bus->dispatch(new SyncPlaylists($user->getId() ?? throw new \LogicException('User not persisted.')));

        return $id;
    }

    /**
     * Copie une playlist sur le compte `$to`, telle qu'elle a été synchronisée : celle que l'utilisateur voit.
     *
     * @return string id Spotify de la copie
     */
    public function copy(Playlist $playlist, User $to, string $name): string
    {
        return $this->create($to, $name, $this->playlistRepository->findTrackIds($playlist));
    }
}
