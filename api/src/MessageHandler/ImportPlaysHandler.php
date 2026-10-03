<?php

namespace App\MessageHandler;

use App\Message\ImportPlays;
use App\Repository\PlayRepository;
use App\Stats\StatsCache;
use Symfony\Component\Messenger\Attribute\AsMessageHandler;

/**
 * Idempotent : réimporter un fichier, ou un export plus récent qui recouvre l'ancien, n'ajoute pas de doublons.
 */
#[AsMessageHandler]
class ImportPlaysHandler
{
    public function __construct(
        private readonly PlayRepository $playRepository,
        private readonly StatsCache $statsCache,
    ) {
    }

    public function __invoke(ImportPlays $message): void
    {
        $this->playRepository->insertMissing($message->userId, $message->plays);
        $this->statsCache->clear($message->userId);
    }
}
