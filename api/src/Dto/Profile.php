<?php

namespace App\Dto;

use App\Entity\User;

/**
 * Compte Spotify tel que le front le voit : jamais ses tokens.
 */
final readonly class Profile
{
    public function __construct(
        public string $id,
        public ?string $displayName,
        public ?string $avatarUrl,
    ) {
    }

    public static function of(User $user): self
    {
        return new self($user->getSpotifyId(), $user->getDisplayName(), $user->getAvatarUrl());
    }
}
