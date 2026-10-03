<?php

namespace App\Playlist;

use App\Entity\Playlist;
use App\Entity\User;
use App\Repository\PlaylistRepository;
use App\Spotify\Model\Playlist as SpotifyPlaylist;
use App\Spotify\Model\PlaylistItem;
use App\Spotify\Model\SavedTracksPage;
use App\Spotify\SpotifyApi;
use App\Stats\StatsCache;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Clock\ClockInterface;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Contracts\HttpClient\Exception\ClientExceptionInterface;

/**
 * Recopie en base les playlists de l'utilisateur et leur contenu.
 *
 * Seules les playlists modifiées depuis la dernière fois (snapshot_id) sont relues : une requête pour la liste,
 * puis une par tranche de 50 titres. Les titres likés suivent, comme une playlist à part.
 * Une synchro interrompue reprend là où elle s'est arrêtée.
 */
class PlaylistSync
{
    public function __construct(
        private readonly SpotifyApi $spotify,
        private readonly PlaylistRepository $playlistRepository,
        private readonly EntityManagerInterface $entityManager,
        private readonly ClockInterface $clock,
        private readonly StatsCache $statsCache,
    ) {
    }

    /**
     * Les stats de l'utilisateur sont recalculées ensuite, même après une synchro interrompue.
     */
    public function sync(User $user): void
    {
        try {
            $this->syncAll($user);
        } finally {
            $this->statsCache->clear($user->getId() ?? throw new \LogicException('User not persisted.'));
        }
    }

    private function syncAll(User $user): void
    {
        $known = $this->playlistRepository->findByUserIndexed($user);

        foreach ($this->spotify->getPlaylists($user) as $remote) {
            $this->syncPlaylist($user, $known[$remote->id] ?? new Playlist($user, $remote->id), $remote);
            unset($known[$remote->id]);
        }

        $this->syncLikedTracks($user, $known[Playlist::LIKED] ?? new Playlist($user, Playlist::LIKED));
        unset($known[Playlist::LIKED]);

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
    private function syncPlaylist(User $user, Playlist $playlist, SpotifyPlaylist $remote): void
    {
        $this->entityManager->persist($playlist->update($remote));
        $this->entityManager->flush();

        if ($playlist->getSnapshotId() === $remote->snapshotId) {
            return;
        }

        $items = $remote->ownerId === $user->getSpotifyId() || $remote->collaborative
            ? $this->unlessRefused(fn (): array => $this->spotify->getPlaylistItems($user, $remote->id))
            : null;

        if (null === $items) {
            $this->markUnreadable($playlist, $remote->snapshotId);
        } else {
            $this->saveTracks($playlist, $items, $remote->snapshotId);
        }
    }

    /**
     * Les titres likés sont rangés comme une playlist (Playlist::LIKED). Faute de snapshot_id, leur première page
     * sert d'empreinte : une seule requête quand rien n'a changé, et elle est réutilisée sinon.
     */
    private function syncLikedTracks(User $user, Playlist $playlist): void
    {
        $this->entityManager->persist($playlist->updateAsLiked());
        $this->entityManager->flush();

        $first = $this->unlessRefused(fn (): SavedTracksPage => $this->spotify->getSavedTracksPage($user));

        if (null === $first) {
            $this->markUnreadable($playlist, null);
        } elseif ($playlist->getSnapshotId() !== $first->snapshotId()) {
            $this->saveTracks($playlist, $this->spotify->getSavedTracks($user, $first), $first->snapshotId());
        }
    }

    /**
     * @param list<PlaylistItem> $items
     */
    private function saveTracks(Playlist $playlist, array $items, string $snapshotId): void
    {
        $this->playlistRepository->replaceTracks($playlist, $items);
        $playlist->markSynced($snapshotId);
        $this->entityManager->flush();
    }

    private function markUnreadable(Playlist $playlist, ?string $snapshotId): void
    {
        $this->playlistRepository->replaceTracks($playlist, []);
        $playlist->markUnreadable($snapshotId);
        $this->entityManager->flush();
    }

    /**
     * @template T
     *
     * @param \Closure(): T $request
     *
     * @return T|null null si Spotify refuse l'accès (403) ou ne trouve rien (404)
     */
    private function unlessRefused(\Closure $request): mixed
    {
        try {
            return $request();
        } catch (ClientExceptionInterface $e) {
            if (!\in_array($e->getResponse()->getStatusCode(), [Response::HTTP_FORBIDDEN, Response::HTTP_NOT_FOUND], true)) {
                throw $e;
            }

            return null;
        }
    }
}
