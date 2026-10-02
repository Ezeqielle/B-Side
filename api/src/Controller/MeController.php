<?php

namespace App\Controller;

use App\Dto\TopTracksQuery;
use App\Entity\User;
use App\Spotify\SpotifyApi;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Attribute\MapQueryString;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

#[Route('/api/me', name: 'api_me')]
class MeController extends AbstractController
{
    #[Route('', name: '', methods: ['GET'])]
    public function me(#[CurrentUser] User $user): JsonResponse
    {
        return $this->json([
            'id' => $user->getSpotifyId(),
            'displayName' => $user->getDisplayName(),
            'avatarUrl' => $user->getAvatarUrl(),
        ]);
    }

    #[Route('/top/tracks', name: '_top_tracks', methods: ['GET'])]
    public function topTracks(
        #[CurrentUser] User $user,
        SpotifyApi $spotifyApi,
        #[MapQueryString] TopTracksQuery $query = new TopTracksQuery(),
    ): JsonResponse {
        return $this->json($spotifyApi->getTopTracks($user, $query->range, $query->limit));
    }
}
