<?php

namespace App\Controller;

use App\Entity\User;
use App\Stats\Artwork;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpKernel\Attribute\MapQueryParameter;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * Images à mettre directement dans un `<img src>` : redirige vers l'image Spotify, ou 404 s'il n'y en a pas.
 */
#[Route('/api/artwork', name: 'api_artwork_', methods: ['GET'])]
class ArtworkController extends AbstractController
{
    use MediaRedirect;

    /** Une URL d'image Spotify ne change pas. */
    private const int MAX_AGE = 86400;

    public function __construct(private readonly Artwork $artwork)
    {
    }

    #[Route('/track/{id}', name: 'track', requirements: ['id' => '[0-9A-Za-z]{22}'])]
    public function track(#[CurrentUser] User $user, string $id): RedirectResponse
    {
        return $this->redirectToMedia(fn (): ?string => $this->artwork->forTrack($user, $id), self::MAX_AGE);
    }

    #[Route('/artist', name: 'artist')]
    public function artist(#[CurrentUser] User $user, #[MapQueryParameter] string $name): RedirectResponse
    {
        return $this->redirectToMedia(fn (): ?string => $this->artwork->forArtist($user, $name), self::MAX_AGE);
    }
}
