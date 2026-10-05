<?php

namespace App\Controller;

use App\Dto\CopyPlaylist;
use App\Dto\CreatePlaylist;
use App\Dto\KeepTracks;
use App\Dto\RemoveFromPlaylists;
use App\Dto\RemoveTracks;
use App\Dto\TrackPosition;
use App\Entity\User;
use App\Message\SyncPlaylists;
use App\Playlist\KeptTracks;
use App\Playlist\PlaylistCleanup;
use App\Playlist\PlaylistCreation;
use App\Playlist\PlaylistStats;
use App\Playlist\SkipFilter;
use App\Repository\PlaylistRepository;
use App\Stats\PlayFilter;
use App\Stats\PlayStats;
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
    private const array OFFSET = ['min_range' => 0];

    public function __construct(private readonly PlaylistStats $stats)
    {
    }

    #[Route('', name: '', methods: ['GET'])]
    public function list(#[CurrentUser] User $user, #[MapQueryString] PlayFilter $filter = new PlayFilter()): JsonResponse
    {
        return $this->json($this->stats->playlists($user, $filter));
    }

    /**
     * Crée une playlist privée sur Spotify avec ces titres, dans l'ordre.
     */
    #[Route('', name: '_create', methods: ['POST'])]
    public function create(#[CurrentUser] User $user, #[MapRequestPayload] CreatePlaylist $payload, PlaylistCreation $creation): JsonResponse
    {
        return $this->json(['id' => $creation->create($user, $payload->name, $payload->trackIds)], Response::HTTP_CREATED);
    }

    /**
     * `syncedAt` change à la fin de chaque synchro : le front s'en sert pour savoir qu'elle est terminée.
     */
    #[Route('/overview', name: '_overview', methods: ['GET'])]
    public function overview(#[CurrentUser] User $user, #[MapQueryString] PlayFilter $filter = new PlayFilter()): JsonResponse
    {
        return $this->json($this->stats->overview($user, $filter));
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
     * Titres les plus écoutés absents des playlists.
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

    /**
     * Morceaux passés selon les seuils de SkipFilter, du dernier passé au plus ancien, avec les positions de leurs
     * versions dans chaque playlist.
     */
    #[Route('/skipped', name: '_skipped', methods: ['GET'])]
    public function skipped(
        #[CurrentUser] User $user,
        #[MapQueryString] SkipFilter $filter = new SkipFilter(),
        #[MapQueryParameter(options: self::LIMIT)] int $limit = 50,
        #[MapQueryParameter(options: self::OFFSET)] int $offset = 0,
    ): JsonResponse {
        return $this->json($this->stats->skippedSongs($user, $filter, $limit, $offset));
    }

    #[Route('/{id}', name: '_show', methods: ['GET'])]
    public function show(#[CurrentUser] User $user, string $id, #[MapQueryString] PlayFilter $filter = new PlayFilter()): JsonResponse
    {
        return $this->json($this->stats->playlist($user, $id, $filter) ?? throw $this->createNotFoundException());
    }

    #[Route('/{id}/tracks', name: '_tracks', methods: ['GET'])]
    public function tracks(
        #[CurrentUser] User $user,
        string $id,
        PlaylistRepository $playlistRepository,
        #[MapQueryString] PlayFilter $filter = new PlayFilter(),
    ): JsonResponse {
        $playlist = $playlistRepository->findOneReadable($user, $id) ?? throw $this->createNotFoundException();

        return $this->json($this->stats->tracks($playlist, $filter));
    }

    /**
     * Versions d'un même morceau (single, album, edit…), par groupe : de quoi n'en garder qu'une.
     */
    #[Route('/{id}/versions', name: '_versions', methods: ['GET'])]
    public function versions(#[CurrentUser] User $user, string $id, PlaylistRepository $playlistRepository): JsonResponse
    {
        $playlist = $playlistRepository->findOneReadable($user, $id) ?? throw $this->createNotFoundException();

        return $this->json($this->stats->versions($playlist));
    }

    /**
     * Copie la playlist sur un autre compte de l'utilisateur, lié au préalable.
     */
    #[Route('/{id}/copy', name: '_copy', methods: ['POST'])]
    public function copy(
        #[CurrentUser] User $user,
        string $id,
        #[MapRequestPayload] CopyPlaylist $payload,
        PlaylistRepository $playlistRepository,
        PlaylistCreation $creation,
    ): JsonResponse {
        $playlist = $playlistRepository->findOneReadable($user, $id) ?? throw $this->createNotFoundException();
        $account = $user->findLinkedAccount($payload->accountId) ?? throw $this->createNotFoundException();

        return $this->json(['id' => $creation->copy($playlist, $account, $payload->name)], Response::HTTP_CREATED);
    }

    /**
     * Titres à garder : le nettoyage les laisse décochés.
     */
    #[Route('/{id}/kept', name: '_kept', methods: ['GET'])]
    public function kept(#[CurrentUser] User $user, string $id, PlaylistRepository $playlistRepository, KeptTracks $keptTracks): JsonResponse
    {
        $playlist = $playlistRepository->findOneReadable($user, $id) ?? throw $this->createNotFoundException();

        return $this->json($keptTracks->list($playlist));
    }

    /**
     * Ajoute des titres à garder (`kept` vrai), ou les rend au nettoyage.
     */
    #[Route('/{id}/kept', name: '_keep', methods: ['POST'])]
    public function keep(
        #[CurrentUser] User $user,
        string $id,
        #[MapRequestPayload] KeepTracks $payload,
        PlaylistRepository $playlistRepository,
        KeptTracks $keptTracks,
    ): Response {
        $playlist = $playlistRepository->findOneReadable($user, $id) ?? throw $this->createNotFoundException();

        if ($payload->kept) {
            $keptTracks->keep($playlist, $payload->trackIds);
        } else {
            $keptTracks->release($playlist, $payload->trackIds);
        }

        return new Response(null, Response::HTTP_NO_CONTENT);
    }

    /**
     * Retire des titres de plusieurs playlists, avec une seule synchro : voir remove().
     */
    #[Route('/remove', name: '_remove_everywhere', methods: ['POST'])]
    public function removeEverywhere(#[CurrentUser] User $user, #[MapRequestPayload] RemoveFromPlaylists $payload, PlaylistCleanup $cleanup): JsonResponse
    {
        $targets = [];
        foreach ($payload->targets as $target) {
            $targets[$target->playlistId] = TrackPosition::byPosition($target->tracks) + ($targets[$target->playlistId] ?? []);
        }

        return $this->json($cleanup->remove($user, $targets));
    }

    /**
     * Retire des titres vus à une position : ils vont dans la corbeille et dans le journal (voir RemovalController).
     * Un titre qui n'est plus à cette position reste en place et compte dans `skipped`.
     */
    #[Route('/{id}/remove', name: '_remove', methods: ['POST'])]
    public function remove(
        #[CurrentUser] User $user,
        string $id,
        #[MapRequestPayload] RemoveTracks $payload,
        PlaylistRepository $playlistRepository,
        PlaylistCleanup $cleanup,
    ): JsonResponse {
        $playlistRepository->findOneReadable($user, $id) ?? throw $this->createNotFoundException();

        return $this->json($cleanup->remove($user, [$id => TrackPosition::byPosition($payload->tracks)]));
    }
}
