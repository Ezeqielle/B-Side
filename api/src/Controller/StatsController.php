<?php

namespace App\Controller;

use App\Entity\User;
use App\Stats\PlayFilter;
use App\Stats\PlayStats;
use App\Stats\StatsCache;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Attribute\MapQueryParameter;
use Symfony\Component\HttpKernel\Attribute\MapQueryString;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * Stats de l'historique importé. Chaque route accepte les paramètres de PlayFilter.
 */
#[Route('/api/stats', name: 'api_stats_', methods: ['GET'])]
class StatsController extends AbstractController
{
    private const array LIMIT = ['min_range' => 1, 'max_range' => 100];

    public function __construct(
        private readonly PlayStats $stats,
        private readonly StatsCache $cache,
    ) {
    }

    #[Route('/overview', name: 'overview')]
    public function overview(#[CurrentUser] User $user, #[MapQueryString] PlayFilter $filter = new PlayFilter()): JsonResponse
    {
        return $this->json($this->cache->get($user, __METHOD__, [$filter], fn () => $this->stats->overview($user, $filter)));
    }

    #[Route('/tracks', name: 'tracks')]
    public function tracks(
        #[CurrentUser] User $user,
        #[MapQueryString] PlayFilter $filter = new PlayFilter(),
        #[MapQueryParameter(options: self::LIMIT)] int $limit = 50,
    ): JsonResponse {
        return $this->json($this->cache->get($user, __METHOD__, [$filter, $limit], fn () => $this->stats->topTracks($user, $filter, $limit)));
    }

    #[Route('/artists', name: 'artists')]
    public function artists(
        #[CurrentUser] User $user,
        #[MapQueryString] PlayFilter $filter = new PlayFilter(),
        #[MapQueryParameter(options: self::LIMIT)] int $limit = 50,
    ): JsonResponse {
        return $this->json($this->cache->get($user, __METHOD__, [$filter, $limit], fn () => $this->stats->topArtists($user, $filter, $limit)));
    }

    #[Route('/timeline', name: 'timeline')]
    public function timeline(#[CurrentUser] User $user, #[MapQueryString] PlayFilter $filter = new PlayFilter()): JsonResponse
    {
        return $this->json($this->cache->get($user, __METHOD__, [$filter], fn () => $this->stats->timeline($user, $filter)));
    }

    #[Route('/clock', name: 'clock')]
    public function clock(#[CurrentUser] User $user, #[MapQueryString] PlayFilter $filter = new PlayFilter()): JsonResponse
    {
        return $this->json($this->cache->get($user, __METHOD__, [$filter], fn () => $this->stats->clock($user, $filter)));
    }
}
