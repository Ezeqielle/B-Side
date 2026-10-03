<?php

namespace App\Controller;

use App\Dto\RestoreRemovals;
use App\Entity\User;
use App\Playlist\PlaylistCleanup;
use App\Playlist\RemovedTrack;
use App\Repository\RemovalRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * Journal des titres retirés des playlists et des likes, et leur remise en place.
 */
#[Route('/api/removals', name: 'api_removals')]
class RemovalController extends AbstractController
{
    #[Route('', name: '', methods: ['GET'])]
    public function list(#[CurrentUser] User $user, RemovalRepository $removalRepository): JsonResponse
    {
        return $this->json(array_map(RemovedTrack::of(...), $removalRepository->findByUser($user)));
    }

    /**
     * Les titres dont la playlist a disparu ne sont pas remis : `restored` peut être inférieur au nombre demandé.
     */
    #[Route('/restore', name: '_restore', methods: ['POST'])]
    public function restore(#[CurrentUser] User $user, #[MapRequestPayload] RestoreRemovals $payload, PlaylistCleanup $cleanup): JsonResponse
    {
        return $this->json(['restored' => $cleanup->restore($user, $payload->ids)]);
    }
}
