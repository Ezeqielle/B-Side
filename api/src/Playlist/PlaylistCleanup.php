<?php

namespace App\Playlist;

use App\Entity\Playlist;
use App\Entity\PlaylistTrack;
use App\Entity\Removal;
use App\Entity\User;
use App\Message\SyncPlaylists;
use App\Repository\PlaylistRepository;
use App\Repository\RemovalRepository;
use App\Spotify\SpotifyApi;
use App\Stats\StatsCache;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Clock\ClockInterface;
use Symfony\Component\Messenger\MessageBusInterface;

/**
 * Retire des titres d'une playlist ou des likes sans rien perdre : ils passent d'abord dans une playlist corbeille
 * sur Spotify, et chaque retrait est noté (Removal) pour pouvoir être annulé.
 *
 * Le contenu en base est mis à jour tout de suite, puis une synchro réaligne positions et versions.
 */
class PlaylistCleanup
{
    public const string TRASH_NAME = 'Spotylist · Corbeille';

    /**
     * Titres traités et notés ensemble : la limite des likes, la plus basse de Spotify.
     * Après une erreur, chaque lot déjà retiré figure dans le journal.
     */
    private const int BATCH = 40;

    public function __construct(
        private readonly SpotifyApi $spotify,
        private readonly PlaylistRepository $playlistRepository,
        private readonly RemovalRepository $removalRepository,
        private readonly EntityManagerInterface $entityManager,
        private readonly ClockInterface $clock,
        private readonly StatsCache $statsCache,
        private readonly MessageBusInterface $bus,
    ) {
    }

    /**
     * @param list<int> $positions titres à retirer ; les autres occurrences d'un même titre restent en place
     *
     * @return int nombre de titres retirés
     */
    public function remove(Playlist $playlist, array $positions): int
    {
        $user = $playlist->getUser();
        $tracks = $this->playlistRepository->findTracks($playlist);
        $removed = array_intersect_key($tracks, array_flip($positions));
        if ([] === $removed) {
            return 0;
        }

        $trash = $user->getTrashPlaylistId() ?? $this->createTrash($user);
        $trashed = array_flip($this->removalRepository->findTrashedTrackIds($user));
        $now = $this->clock->now();

        try {
            foreach (array_chunk($removed, self::BATCH) as $batch) {
                $ids = self::trackIds($batch);
                $this->spotify->addToPlaylist($user, $trash, array_values(array_diff($ids, array_keys($trashed))));
                $trashed += array_flip($ids);

                if (Playlist::LIKED === $playlist->getSpotifyId()) {
                    $this->spotify->removeSavedTracks($user, $ids);
                } else {
                    $this->spotify->removeFromPlaylist($user, $playlist->getSpotifyId(), $ids);
                }

                foreach ($batch as $track) {
                    $this->entityManager->persist(new Removal(
                        $user,
                        $track->getTrack(),
                        $playlist->getSpotifyId(),
                        $playlist->getName(),
                        $track->getPosition(),
                        $track->getAddedAt(),
                        $now,
                    ));
                    $this->entityManager->remove($track);
                }
                $this->entityManager->flush();
            }

            $this->putBackKeptCopies($playlist, $tracks, $removed);
        } finally {
            $this->resync($user);
        }

        return \count($removed);
    }

    /**
     * Remet les titres en place : en tête des likes, ou à la fin de leur playlist si elle est encore là.
     * Ils quittent la corbeille, sauf s'ils y sont aussi pour un autre retrait.
     *
     * @param list<int> $ids retraits à annuler
     *
     * @return int nombre de titres remis en place
     */
    public function restore(User $user, array $ids): int
    {
        $playlists = $this->playlistRepository->findByUserIndexed($user);
        $removals = array_filter(
            $this->removalRepository->findPending($user, $ids),
            static fn (Removal $removal): bool => isset($playlists[$removal->getPlaylistId()]),
        );
        if ([] === $removals) {
            return 0;
        }

        $byPlaylist = [];
        foreach ($removals as $removal) {
            $byPlaylist[$removal->getPlaylistId()][] = $removal;
        }

        $now = $this->clock->now();
        try {
            foreach ($byPlaylist as $playlistId => $batch) {
                $trackIds = array_values(array_unique(array_map(static fn (Removal $removal): string => $removal->getTrack()->getId(), $batch)));
                if (Playlist::LIKED === (string) $playlistId) {
                    $this->spotify->saveTracks($user, $trackIds);
                } else {
                    $this->spotify->addToPlaylist($user, (string) $playlistId, $trackIds);
                }

                foreach ($batch as $removal) {
                    $removal->markRestored($now);
                }
                $this->entityManager->flush();
            }

            $trash = $user->getTrashPlaylistId();
            if (null !== $trash) {
                $restored = array_map(static fn (Removal $removal): string => $removal->getTrack()->getId(), $removals);
                $this->spotify->removeFromPlaylist($user, $trash, array_values(array_diff(
                    array_unique($restored),
                    $this->removalRepository->findTrashedTrackIds($user),
                )));
            }
        } finally {
            $this->resync($user);
        }

        return \count($removals);
    }

    private function createTrash(User $user): string
    {
        $id = $this->spotify->createPlaylist($user, self::TRASH_NAME, 'Titres retirés par Spotylist, à remettre en place depuis son journal.');
        $user->setTrashPlaylistId($id);
        $this->entityManager->flush();

        return $id;
    }

    /**
     * Spotify retire toutes les occurrences d'un titre : celles qu'on garde sont remises à leur place.
     * Remises dans l'ordre, chacune arrive après les titres gardés qui la précèdent.
     *
     * @param array<int, PlaylistTrack> $tracks  contenu d'origine, par position
     * @param array<int, PlaylistTrack> $removed titres retirés, par position
     */
    private function putBackKeptCopies(Playlist $playlist, array $tracks, array $removed): void
    {
        $removedIds = array_flip(self::trackIds($removed));
        $index = 0;
        foreach ($tracks as $position => $track) {
            if (isset($removed[$position])) {
                continue;
            }
            if (isset($removedIds[$track->getTrack()->getId()])) {
                $this->spotify->addToPlaylist($playlist->getUser(), $playlist->getSpotifyId(), [$track->getTrack()->getId()], $index);
            }
            $index++;
        }
    }

    /**
     * Stats à recalculer, et contenu à relire sur Spotify.
     */
    private function resync(User $user): void
    {
        $userId = $user->getId() ?? throw new \LogicException('User not persisted.');
        $this->statsCache->clear($userId);
        $this->bus->dispatch(new SyncPlaylists($userId));
    }

    /**
     * @param array<PlaylistTrack> $tracks
     *
     * @return list<string> sans doublon
     */
    private static function trackIds(array $tracks): array
    {
        return array_values(array_unique(array_map(static fn (PlaylistTrack $track): string => $track->getTrack()->getId(), $tracks)));
    }
}
