<?php

namespace App\Controller;

use App\Deezer\DeezerException;
use App\Entity\User;
use App\Stats\Preview;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpKernel\EventListener\AbstractSessionListener;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Contracts\HttpClient\Exception\ExceptionInterface;

/**
 * Extraits à mettre directement dans un `<audio src>` : redirige vers le MP3 Deezer, ou 404 s'il n'y en a pas.
 */
#[Route('/api/preview', name: 'api_preview_', methods: ['GET'])]
class PreviewController extends AbstractController
{
    /** Moins que les ~15 min de validité de l'URL Deezer. */
    private const int MAX_AGE = 300;

    public function __construct(private readonly Preview $preview)
    {
    }

    #[Route('/track/{id}', name: 'track', requirements: ['id' => '[0-9A-Za-z]{22}'])]
    public function track(#[CurrentUser] User $user, string $id): RedirectResponse
    {
        try {
            $url = $this->preview->forTrack($user, $id);
        } catch (ExceptionInterface|DeezerException) {
            // Spotify ou Deezer indisponible, ou quota dépassé : rien en cache, on retentera plus tard
            $url = null;
        }

        if (null === $url) {
            throw $this->createNotFoundException();
        }

        $response = $this->redirect($url);
        $response->setPrivate()->setMaxAge(self::MAX_AGE);
        $response->headers->set(AbstractSessionListener::NO_AUTO_CACHE_CONTROL_HEADER, 'true');

        return $response;
    }
}
