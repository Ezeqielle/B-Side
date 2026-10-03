<?php

namespace App\Controller;

use App\Entity\User;
use App\Stats\Artwork;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpKernel\Attribute\MapQueryParameter;
use Symfony\Component\HttpKernel\EventListener\AbstractSessionListener;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Contracts\HttpClient\Exception\ExceptionInterface;

/**
 * Images à mettre directement dans un `<img src>` : redirige vers l'image Spotify, ou 404 s'il n'y en a pas.
 */
#[Route('/api/artwork', name: 'api_artwork_', methods: ['GET'])]
class ArtworkController extends AbstractController
{
    public function __construct(private readonly Artwork $artwork)
    {
    }

    #[Route('/track/{id}', name: 'track', requirements: ['id' => '[0-9A-Za-z]{22}'])]
    public function track(#[CurrentUser] User $user, string $id): RedirectResponse
    {
        return $this->redirectToImage(fn (): ?string => $this->artwork->forTrack($user, $id));
    }

    #[Route('/artist', name: 'artist')]
    public function artist(#[CurrentUser] User $user, #[MapQueryParameter] string $name): RedirectResponse
    {
        return $this->redirectToImage(fn (): ?string => $this->artwork->forArtist($user, $name));
    }

    /**
     * @param \Closure(): ?string $find
     */
    private function redirectToImage(\Closure $find): RedirectResponse
    {
        try {
            $url = $find();
        } catch (ExceptionInterface) {
            // Spotify indisponible ou quota dépassé : rien en cache, on retentera plus tard
            $url = null;
        }

        if (null === $url) {
            throw $this->createNotFoundException();
        }

        // Une URL d'image Spotify ne change pas : le navigateur peut garder la redirection
        $response = $this->redirect($url);
        $response->setPrivate()->setMaxAge(86400);
        $response->headers->set(AbstractSessionListener::NO_AUTO_CACHE_CONTROL_HEADER, 'true');

        return $response;
    }
}
