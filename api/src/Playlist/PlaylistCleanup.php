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
 * Retire des titres des playlists ou des likes sans rien perdre : ils passent d'abord dans une playlist corbeille
 * sur Spotify, et chaque retrait est noté (Removal) pour pouvoir être annulé.
 *
 * Le contenu en base est mis à jour tout de suite, puis une synchro réaligne positions et versions.
 */
class PlaylistCleanup
{
    public const string TRASH_NAME = 'B-Side · Corbeille';

    /**
     * Titres traités et notés ensemble : la limite des likes, la plus basse de Spotify.
     * Après une erreur, chaque lot déjà retiré figure dans le journal.
     */
    private const int BATCH = SpotifyApi::LIBRARY_BATCH;

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
     * Retire des titres d'une ou plusieurs playlists, puis lance une seule synchro. Un titre n'est retiré que s'il est
     * encore à la position vue : une synchro a pu renuméroter la playlist entre-temps.
     *
     * @param array<string, array<int, string>> $targets par playlist (id Spotify, ou `Playlist::LIKED`), l'id Spotify
     *                                                   de chaque titre à retirer, par position ; les autres
     *                                                   occurrences d'un même titre restent en place
     */
    public function remove(User $user, array $targets): RemovalResult
    {
        $plan = $this->findTargets($user, $targets);
        $requested = array_sum(array_map(\count(...), $targets));
        $removed = array_sum(array_map(static fn (array $target): int => \count($target[2]), $plan));
        if (0 === $removed) {
            return new RemovalResult(0, $requested);
        }

        $trash = $user->getTrashPlaylistId() ?? $this->createTrash($user);
        $trashed = array_flip($this->removalRepository->findTrashedTrackIds($user));
        $now = $this->clock->now();

        try {
            foreach ($plan as [$playlist, $content, $matching]) {
                foreach (array_chunk($matching, self::BATCH) as $batch) {
                    $ids = self::trackIds($batch);
                    $this->spotify->addTracks($user, $trash, array_values(array_diff($ids, array_keys($trashed))));
                    $trashed += array_flip($ids);
                    $this->spotify->removeTracks($user, $playlist->getSpotifyId(), $ids);

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

                $this->putBackKeptCopies($playlist, $content, $matching);
            }
        } finally {
            $this->resync($user);
        }

        return new RemovalResult($removed, $requested - $removed);
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
                $this->spotify->addTracks($user, (string) $playlistId, $trackIds);

                foreach ($batch as $removal) {
                    $removal->markRestored($now);
                }
                $this->entityManager->flush();
            }

            $trash = $user->getTrashPlaylistId();
            if (null !== $trash) {
                $restored = array_map(static fn (Removal $removal): string => $removal->getTrack()->getId(), $removals);
                $this->spotify->removeTracks($user, $trash, array_values(array_diff(
                    array_unique($restored),
                    $this->removalRepository->findTrashedTrackIds($user),
                )));
            }
        } finally {
            $this->resync($user);
        }

        return \count($removals);
    }

    /**
     * Playlists lisibles visées, leur contenu, et les titres encore à la position vue.
     *
     * @param array<string, array<int, string>> $targets
     *
     * @return list<array{Playlist, array<int, PlaylistTrack>, non-empty-array<int, PlaylistTrack>}>
     */
    private function findTargets(User $user, array $targets): array
    {
        $playlists = $this->playlistRepository->findByUserIndexed($user);
        $found = [];
        foreach ($targets as $playlistId => $tracks) {
            $playlist = $playlists[$playlistId] ?? null;
            if (null === $playlist || !$playlist->isReadable()) {
                continue;
            }
            $content = $this->playlistRepository->findTracks($playlist);
            $matching = array_filter(
                $content,
                static fn (PlaylistTrack $track, int $position): bool => ($tracks[$position] ?? null) === $track->getTrack()->getId(),
                \ARRAY_FILTER_USE_BOTH,
            );
            if ([] !== $matching) {
                $found[] = [$playlist, $content, $matching];
            }
        }

        return $found;
    }

    private function createTrash(User $user): string
    {
        $id = $this->spotify->createPlaylist($user, self::TRASH_NAME, 'Titres retirés par B-Side, à remettre en place depuis son journal.');
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
                $this->spotify->addTracks($playlist->getUser(), $playlist->getSpotifyId(), [$track->getTrack()->getId()], $index);
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
