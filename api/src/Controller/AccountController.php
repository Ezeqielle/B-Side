<?php

namespace App\Controller;

use App\Dto\Profile;
use App\Entity\User;
use App\Security\SpotifyAccounts;
use App\Spotify\SpotifyScopes;
use Doctrine\ORM\EntityManagerInterface;
use KnpU\OAuth2ClientBundle\Client\ClientRegistry;
use KnpU\OAuth2ClientBundle\Exception\OAuth2ClientException;
use League\OAuth2\Client\Provider\Exception\IdentityProviderException;
use League\OAuth2\Client\Token\AccessToken;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * Autres comptes Spotify de l'utilisateur. On en lie un en s'y connectant depuis sa session :
 * c'est la preuve qu'il est à lui, et la session reste la sienne.
 */
#[Route('/api/accounts', name: 'api_accounts')]
class AccountController extends AbstractController
{
    private const string CLIENT = 'spotify_link';

    #[Route('', name: '', methods: ['GET'])]
    public function list(#[CurrentUser] User $user): JsonResponse
    {
        return $this->json(array_map(Profile::of(...), $user->getLinkedAccounts()));
    }

    /**
     * Spotify demande toujours quel compte autoriser (`show_dialog`) : sinon il reprendrait en silence
     * celui déjà connecté dans le navigateur.
     */
    #[Route('/link', name: '_link', methods: ['GET'])]
    public function link(ClientRegistry $clientRegistry): RedirectResponse
    {
        return $clientRegistry->getClient(self::CLIENT)->redirect([], [
            'scope' => implode(' ', SpotifyScopes::ALL),
            'show_dialog' => 'true',
        ]);
    }

    /**
     * Le `state` OAuth, gardé en session, garantit que c'est bien cet utilisateur qui a lancé la liaison.
     * Ouvert sans session (`security.yaml`) : si elle a expiré chez Spotify, on renvoie à la connexion
     * plutôt qu'une erreur JSON en pleine navigation.
     */
    #[Route('/link/callback', name: '_link_callback', methods: ['GET'])]
    public function linkCallback(
        #[CurrentUser] ?User $user,
        ClientRegistry $clientRegistry,
        SpotifyAccounts $accounts,
        EntityManagerInterface $entityManager,
    ): RedirectResponse {
        if (null === $user) {
            return $this->redirect('/login');
        }

        $client = $clientRegistry->getClient(self::CLIENT);
        try {
            /** @var AccessToken $accessToken */
            $accessToken = $client->getAccessToken();
            // Spotify refuse le profil (403) d'un compte absent des utilisateurs de l'app
            $account = $accounts->save($client, $accessToken);
        } catch (OAuth2ClientException|IdentityProviderException) {
            return $this->redirect('/comptes?error=failed');
        }

        if ($account === $user) {
            return $this->redirect('/comptes?error=same');
        }

        $user->link($account);
        $entityManager->flush();

        return $this->redirect('/comptes');
    }

    #[Route('/{id}', name: '_unlink', methods: ['DELETE'])]
    public function unlink(#[CurrentUser] User $user, string $id, EntityManagerInterface $entityManager): Response
    {
        $user->unlink($user->findLinkedAccount($id) ?? throw $this->createNotFoundException());
        $entityManager->flush();

        return new Response(status: Response::HTTP_NO_CONTENT);
    }
}
