<?php

namespace App\Playlist;

use App\Entity\KeptTrack;
use App\Entity\Playlist;
use App\Repository\KeptTrackRepository;
use App\Repository\PlaylistRepository;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Clock\ClockInterface;

/**
 * Titres à garder d'une playlist : décochés d'office par le nettoyage, quelles que soient ses règles.
 */
class KeptTracks
{
    public function __construct(
        private readonly KeptTrackRepository $keptTrackRepository,
        private readonly PlaylistRepository $playlistRepository,
        private readonly EntityManagerInterface $entityManager,
        private readonly ClockInterface $clock,
    ) {
    }

    /**
     * @return list<KeptTrackStat>
     */
    public function list(Playlist $playlist): array
    {
        return array_map(KeptTrackStat::of(...), $this->keptTrackRepository->findByPlaylist($playlist));
    }

    /**
     * Seuls les titres de la playlist sont gardés, chacun une fois.
     *
     * @param list<string> $trackIds ids Spotify
     */
    public function keep(Playlist $playlist, array $trackIds): void
    {
        $kept = array_map(static fn (KeptTrack $kept): string => $kept->getTrack()->getId(), $this->keptTrackRepository->findByPlaylist($playlist));
        $wanted = array_flip(array_diff($trackIds, $kept));
        $now = $this->clock->now();

        foreach ($this->playlistRepository->findTracks($playlist) as $playlistTrack) {
            $track = $playlistTrack->getTrack();
            if (isset($wanted[$track->getId()])) {
                $this->entityManager->persist(new KeptTrack($playlist, $track, $now));
                unset($wanted[$track->getId()]);
            }
        }
        $this->entityManager->flush();
    }

    /**
     * Rend les titres au nettoyage.
     *
     * @param list<string> $trackIds ids Spotify
     */
    public function release(Playlist $playlist, array $trackIds): void
    {
        $this->keptTrackRepository->deleteTracks($playlist, $trackIds);
    }
}
