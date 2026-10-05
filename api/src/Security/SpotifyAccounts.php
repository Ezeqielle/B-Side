<?php

namespace App\Security;

use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Kerox\OAuth2\Client\Provider\SpotifyResourceOwner;
use KnpU\OAuth2ClientBundle\Client\OAuth2ClientInterface;
use League\OAuth2\Client\Token\AccessToken;

/**
 * Enregistre le compte Spotify qui vient d'autoriser l'app : profil et tokens, créé à sa première venue.
 */
class SpotifyAccounts
{
    public function __construct(
        private readonly UserRepository $userRepository,
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    public function save(OAuth2ClientInterface $client, AccessToken $accessToken): User
    {
        /** @var SpotifyResourceOwner $owner */
        $owner = $client->fetchUserFromToken($accessToken);

        $user = $this->userRepository->findOneBySpotifyId($owner->getId()) ?? new User($owner->getId());
        $user
            ->setDisplayName($owner->getDisplayName())
            ->setAvatarUrl($owner->getImages()[0]['url'] ?? null)
            ->updateTokens(
                $accessToken->getToken(),
                $accessToken->getRefreshToken(),
                new \DateTimeImmutable()->setTimestamp($accessToken->getExpires() ?? time() + 3600),
            );

        $this->entityManager->persist($user);
        $this->entityManager->flush();

        return $user;
    }
}
