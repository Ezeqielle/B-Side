<?php

namespace App\Controller;

use App\Entity\User;
use App\Stats\Preview;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * Extraits à mettre directement dans un `<audio src>` : redirige vers le MP3 Deezer, ou 404 s'il n'y en a pas.
 */
#[Route('/api/preview', name: 'api_preview_', methods: ['GET'])]
class PreviewController extends AbstractController
{
    use MediaRedirect;

    /** Moins que les ~15 min de validité de l'URL Deezer. */
    private const int MAX_AGE = 300;

    public function __construct(private readonly Preview $preview)
    {
    }

    #[Route('/track/{id}', name: 'track', requirements: ['id' => '[0-9A-Za-z]{22}'])]
    public function track(#[CurrentUser] User $user, string $id): RedirectResponse
    {
        return $this->redirectToMedia(fn (): ?string => $this->preview->forTrack($user, $id), self::MAX_AGE);
    }
}
