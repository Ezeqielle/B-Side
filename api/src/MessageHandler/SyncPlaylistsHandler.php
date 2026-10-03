<?php

namespace App\MessageHandler;

use App\Message\SyncPlaylists;
use App\Playlist\PlaylistSync;
use App\Repository\UserRepository;
use Symfony\Component\Messenger\Attribute\AsMessageHandler;

#[AsMessageHandler]
class SyncPlaylistsHandler
{
    public function __construct(
        private readonly UserRepository $userRepository,
        private readonly PlaylistSync $playlistSync,
    ) {
    }

    public function __invoke(SyncPlaylists $message): void
    {
        $user = $this->userRepository->find($message->userId);
        if (null !== $user) {
            $this->playlistSync->sync($user);
        }
    }
}
