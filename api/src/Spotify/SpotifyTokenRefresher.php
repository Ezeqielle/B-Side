<?php

namespace App\Spotify;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use KnpU\OAuth2ClientBundle\Client\ClientRegistry;
use League\OAuth2\Client\Token\AccessToken;
use Psr\Clock\ClockInterface;

/**
 * Fournit un access token valide, en le rafraîchissant s'il expire dans moins d'une minute.
 */
class SpotifyTokenRefresher
{
    public function __construct(
        private readonly ClientRegistry $clientRegistry,
        private readonly EntityManagerInterface $entityManager,
        private readonly ClockInterface $clock,
    ) {
    }

    public function getValidAccessToken(User $user): string
    {
        if ($user->getTokenExpiresAt() > $this->clock->now()->modify('+1 minute')) {
            return $user->getAccessToken();
        }

        /** @var AccessToken $token */
        $token = $this->clientRegistry->getClient('spotify')->getOAuth2Provider()->getAccessToken('refresh_token', [
            'refresh_token' => $user->getRefreshToken(),
        ]);

        $user->updateTokens(
            $token->getToken(),
            $token->getRefreshToken(),
            $this->clock->now()->setTimestamp($token->getExpires() ?? $this->clock->now()->getTimestamp() + 3600),
        );
        $this->entityManager->flush();

        return $user->getAccessToken();
    }
}
