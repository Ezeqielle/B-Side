<?php

namespace App\Playlist;

use App\Entity\Playlist;
use App\Entity\User;
use App\Repository\PlaylistRepository;
use App\Repository\TrackRepository;
use App\Spotify\Model\Playlist as SpotifyPlaylist;
use App\Spotify\Model\PlaylistItem;
use App\Spotify\SpotifyApi;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Clock\ClockInterface;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Contracts\HttpClient\Exception\ClientExceptionInterface;

/**
 * Recopie en base les playlists de l'utilisateur et leur contenu.
 *
 * Seules les playlists modifiées depuis la dernière fois (snapshot_id) sont relues : une requête pour la liste,
 * puis une par tranche de 50 titres. Une synchro interrompue reprend là où elle s'est arrêtée.
 */
class PlaylistSync
{
    public function __construct(
        private readonly SpotifyApi $spotify,
        private readonly PlaylistRepository $playlistRepository,
        private readonly TrackRepository $trackRepository,
        private readonly EntityManagerInterface $entityManager,
        private readonly ClockInterface $clock,
    ) {
    }

    public function sync(User $user): void
    {
        $known = $this->playlistRepository->findByUserIndexed($user);

        foreach ($this->spotify->getPlaylists($user) as $remote) {
            $playlist = $known[$remote->id] ?? new Playlist($user, $remote->id);
            unset($known[$remote->id]);

            $this->entityManager->persist($playlist->update($remote));
            $this->entityManager->flush();

            if ($playlist->getSnapshotId() !== $remote->snapshotId) {
                $this->syncTracks($user, $playlist, $remote);
            }
        }

        // Playlists supprimées ou plus suivies
        foreach ($known as $playlist) {
            $this->entityManager->remove($playlist);
        }

        $user->setPlaylistsSyncedAt($this->clock->now());
        $this->entityManager->flush();
    }

    /**
     * Spotify ne donne le contenu qu'au propriétaire et aux collaborateurs : les playlists suivies
     * ne sont pas demandées, et un refus est mémorisé jusqu'à la prochaine modification.
     */
    private function syncTracks(User $user, Playlist $playlist, SpotifyPlaylist $remote): void
    {
        $items = null;
        if ($remote->ownerId === $user->getSpotifyId() || $remote->collaborative) {
            try {
                $items = $this->spotify->getPlaylistItems($user, $remote->id);
            } catch (ClientExceptionInterface $e) {
                if (!\in_array($e->getResponse()->getStatusCode(), [Response::HTTP_FORBIDDEN, Response::HTTP_NOT_FOUND], true)) {
                    throw $e;
                }
            }
        }

        if (null === $items) {
            $this->playlistRepository->replaceTracks($playlist, []);
            $playlist->markUnreadable($remote->snapshotId);
        } else {
            if ([] !== $items) {
                $this->trackRepository->saveFromSpotify(array_map(static fn (PlaylistItem $item) => $item->track, $items));
            }
            $this->playlistRepository->replaceTracks($playlist, $items);
            $playlist->markSynced($remote->snapshotId);
        }

        $this->entityManager->flush();
    }
}
