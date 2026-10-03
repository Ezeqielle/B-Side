<?php

namespace App\Controller;

use App\Dto\RemoveTracks;
use App\Entity\User;
use App\Message\SyncPlaylists;
use App\Playlist\PlaylistCleanup;
use App\Playlist\PlaylistStats;
use App\Repository\PlaylistRepository;
use App\Stats\PlayFilter;
use App\Stats\PlayStats;
use App\Stats\StatsCache;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapQueryParameter;
use Symfony\Component\HttpKernel\Attribute\MapQueryString;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Messenger\MessageBusInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * Playlists de l'utilisateur, recopiées depuis Spotify, et leurs stats croisées avec l'historique.
 * Les stats acceptent les paramètres de PlayFilter : seules les écoutes sélectionnées comptent.
 */
#[Route('/api/playlists', name: 'api_playlists')]
class PlaylistController extends AbstractController
{
    private const array LIMIT = ['min_range' => 1, 'max_range' => 100];

    public function __construct(
        private readonly PlaylistStats $stats,
        private readonly StatsCache $cache,
    ) {
    }

    #[Route('', name: '', methods: ['GET'])]
    public function list(#[CurrentUser] User $user, #[MapQueryString] PlayFilter $filter = new PlayFilter()): JsonResponse
    {
        return $this->json($this->cache->get($user, __METHOD__, [$filter], fn () => $this->stats->playlists($user, $filter)));
    }

    /**
     * `syncedAt` change à la fin de chaque synchro : le front s'en sert pour savoir qu'elle est terminée.
     */
    #[Route('/overview', name: '_overview', methods: ['GET'])]
    public function overview(#[CurrentUser] User $user, #[MapQueryString] PlayFilter $filter = new PlayFilter()): JsonResponse
    {
        return $this->json($this->cache->get($user, __METHOD__, [$filter], fn () => $this->stats->overview($user, $filter)));
    }

    #[Route('/sync', name: '_sync', methods: ['POST'])]
    public function sync(#[CurrentUser] User $user, MessageBusInterface $bus): JsonResponse
    {
        $bus->dispatch(new SyncPlaylists($user->getId() ?? throw new \LogicException('User not persisted.')));

        return $this->json(null, Response::HTTP_ACCEPTED);
    }

    #[Route('/duplicates', name: '_duplicates', methods: ['GET'])]
    public function duplicates(
        #[CurrentUser] User $user,
        #[MapQueryParameter(options: self::LIMIT)] int $limit = 50,
    ): JsonResponse {
        return $this->json($this->cache->get($user, __METHOD__, [$limit], fn () => $this->stats->duplicates($user, $limit)));
    }

    /**
     * Titres les plus écoutés absents des playlists.
     */
    #[Route('/missing', name: '_missing', methods: ['GET'])]
    public function missing(
        #[CurrentUser] User $user,
        PlayStats $playStats,
        #[MapQueryString] PlayFilter $filter = new PlayFilter(),
        #[MapQueryParameter(options: self::LIMIT)] int $limit = 50,
    ): JsonResponse {
        return $this->json($this->cache->get($user, __METHOD__, [$filter, $limit], static fn () => $playStats->topTracksOutsidePlaylists($user, $filter, $limit)));
    }

    #[Route('/{id}', name: '_show', methods: ['GET'])]
    public function show(#[CurrentUser] User $user, string $id, #[MapQueryString] PlayFilter $filter = new PlayFilter()): JsonResponse
    {
        $playlist = $this->cache->get($user, __METHOD__, [$id, $filter], fn () => $this->stats->playlist($user, $id, $filter));

        return $this->json($playlist ?? throw $this->createNotFoundException());
    }

    #[Route('/{id}/tracks', name: '_tracks', methods: ['GET'])]
    public function tracks(
        #[CurrentUser] User $user,
        string $id,
        PlaylistRepository $playlistRepository,
        #[MapQueryString] PlayFilter $filter = new PlayFilter(),
    ): JsonResponse {
        return $this->json($this->cache->get($user, __METHOD__, [$id, $filter], function () use ($user, $id, $playlistRepository, $filter): array {
            $playlist = $playlistRepository->findOneReadable($user, $id) ?? throw $this->createNotFoundException();

            return $this->stats->tracks($playlist, $filter);
        }));
    }

    /**
     * Versions d'un même morceau (single, album, edit…), par groupe : de quoi n'en garder qu'une.
     */
    #[Route('/{id}/versions', name: '_versions', methods: ['GET'])]
    public function versions(#[CurrentUser] User $user, string $id, PlaylistRepository $playlistRepository): JsonResponse
    {
        return $this->json($this->cache->get($user, __METHOD__, [$id], function () use ($user, $id, $playlistRepository): array {
            $playlist = $playlistRepository->findOneReadable($user, $id) ?? throw $this->createNotFoundException();

            return $this->stats->versions($playlist);
        }));
    }

    /**
     * Retire des titres, par position : ils vont dans la corbeille et dans le journal (voir RemovalController).
     */
    #[Route('/{id}/remove', name: '_remove', methods: ['POST'])]
    public function remove(
        #[CurrentUser] User $user,
        string $id,
        #[MapRequestPayload] RemoveTracks $payload,
        PlaylistRepository $playlistRepository,
        PlaylistCleanup $cleanup,
    ): JsonResponse {
        $playlist = $playlistRepository->findOneReadable($user, $id) ?? throw $this->createNotFoundException();

        return $this->json(['removed' => $cleanup->remove($playlist, $payload->positions)]);
    }
}
