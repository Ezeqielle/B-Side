<?php

namespace App\Controller;

use App\Entity\User;
use App\Message\SyncPlaylists;
use App\Playlist\PlaylistStats;
use App\Repository\PlaylistRepository;
use App\Stats\PlayFilter;
use App\Stats\PlayStats;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapQueryParameter;
use Symfony\Component\HttpKernel\Attribute\MapQueryString;
use Symfony\Component\Messenger\MessageBusInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * Playlists de l'utilisateur, recopiées depuis Spotify, et leurs stats croisées avec l'historique.
 */
#[Route('/api/playlists', name: 'api_playlists')]
class PlaylistController extends AbstractController
{
    private const array LIMIT = ['min_range' => 1, 'max_range' => 100];

    public function __construct(private readonly PlaylistStats $stats)
    {
    }

    #[Route('', name: '', methods: ['GET'])]
    public function list(#[CurrentUser] User $user): JsonResponse
    {
        return $this->json($this->stats->playlists($user));
    }

    /**
     * `syncedAt` change à la fin de chaque synchro : le front s'en sert pour savoir qu'elle est terminée.
     */
    #[Route('/overview', name: '_overview', methods: ['GET'])]
    public function overview(#[CurrentUser] User $user): JsonResponse
    {
        return $this->json($this->stats->overview($user));
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
        return $this->json($this->stats->duplicates($user, $limit));
    }

    /**
     * Titres les plus écoutés absents des playlists, filtrables comme les stats d'écoute.
     */
    #[Route('/missing', name: '_missing', methods: ['GET'])]
    public function missing(
        #[CurrentUser] User $user,
        PlayStats $playStats,
        #[MapQueryString] PlayFilter $filter = new PlayFilter(),
        #[MapQueryParameter(options: self::LIMIT)] int $limit = 50,
    ): JsonResponse {
        return $this->json($playStats->topTracksOutsidePlaylists($user, $filter, $limit));
    }

    #[Route('/{id}/tracks', name: '_tracks', methods: ['GET'])]
    public function tracks(#[CurrentUser] User $user, string $id, PlaylistRepository $playlistRepository): JsonResponse
    {
        $playlist = $playlistRepository->findOneReadable($user, $id) ?? throw $this->createNotFoundException();

        return $this->json($this->stats->tracks($playlist));
    }
}
