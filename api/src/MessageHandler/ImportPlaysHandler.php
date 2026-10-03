<?php

namespace App\MessageHandler;

use App\Message\ImportPlays;
use App\Repository\PlayRepository;
use App\Repository\TrackRepository;
use Symfony\Component\Messenger\Attribute\AsMessageHandler;

/**
 * Idempotent : réimporter un fichier, ou un export plus récent qui recouvre l'ancien, n'ajoute pas de doublons.
 */
#[AsMessageHandler]
class ImportPlaysHandler
{
    public function __construct(
        private readonly TrackRepository $trackRepository,
        private readonly PlayRepository $playRepository,
    ) {
    }

    public function __invoke(ImportPlays $message): void
    {
        $this->trackRepository->insertMissing($message->plays);
        $this->playRepository->insertMissing($message->userId, $message->plays);
    }
}
