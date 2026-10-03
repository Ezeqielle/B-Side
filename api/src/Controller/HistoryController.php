<?php

namespace App\Controller;

use App\Entity\User;
use App\History\StreamingHistoryParser;
use App\Message\ImportPlays;
use App\Repository\PlayRepository;
use App\Stats\StatsCache;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapUploadedFile;
use Symfony\Component\Messenger\MessageBusInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

#[Route('/api/history', name: 'api_history')]
class HistoryController extends AbstractController
{
    private const int BATCH_SIZE = 1000;

    #[Route('', name: '', methods: ['GET'])]
    public function summary(#[CurrentUser] User $user, PlayRepository $playRepository, StatsCache $cache): JsonResponse
    {
        return $this->json($cache->get($user, __METHOD__, [], static fn () => $playRepository->summarize($user)));
    }

    /**
     * Reçoit un fichier de l'historique étendu : il est lu tout de suite (erreur 422 s'il n'est pas valide),
     * puis enregistré par lots par le worker.
     */
    #[Route('', name: '_import', methods: ['POST'])]
    public function import(
        #[CurrentUser] User $user,
        #[MapUploadedFile] UploadedFile $file,
        StreamingHistoryParser $parser,
        MessageBusInterface $bus,
    ): JsonResponse {
        $plays = $parser->parse($file->getContent());
        $userId = $user->getId() ?? throw new \LogicException('User not persisted.');

        foreach (array_chunk($plays, self::BATCH_SIZE) as $batch) {
            $bus->dispatch(new ImportPlays($userId, $batch));
        }

        return $this->json(['plays' => \count($plays)], Response::HTTP_ACCEPTED);
    }
}
